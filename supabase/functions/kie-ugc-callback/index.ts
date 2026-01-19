import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    console.log('KIE UGC callback received:', JSON.stringify(payload, null, 2));

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Extract data from KIE callback
    const taskId = payload.taskId || payload.task_id;
    const status = payload.status;
    const videoUrl = payload.output?.video_url || payload.result?.video_url || payload.video_url;
    const metadata = payload.metadata || {};
    const generationId = metadata.generationId;
    const scene = metadata.scene;

    if (!taskId) {
      console.error('No taskId in callback');
      return new Response(
        JSON.stringify({ error: 'No taskId provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the generation by task ID if not in metadata
    let generation;
    if (generationId) {
      const { data } = await supabase
        .from('ugc_generations')
        .select('*')
        .eq('id', generationId)
        .single();
      generation = data;
    } else {
      // Search by task ID
      const { data } = await supabase
        .from('ugc_generations')
        .select('*')
        .or(`video_1_task_id.eq.${taskId},video_2_task_id.eq.${taskId}`)
        .single();
      generation = data;
    }

    if (!generation) {
      console.error('Generation not found for task:', taskId);
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found generation:', generation.id);

    if (status === 'completed' && videoUrl) {
      // Download the video and upload to our storage
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error('Failed to download video from KIE');
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const timestamp = Date.now();
      const sceneName = scene || (generation.video_1_task_id === taskId ? 'scene1' : 'scene2');
      const fileName = `ugc/${generation.id}/${sceneName}_${timestamp}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(fileName, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('generated-content')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('Video uploaded:', publicUrl);

      // Update the correct video URL
      const isScene1 = generation.video_1_task_id === taskId || scene === 'scene_1';
      const updateData: Record<string, unknown> = isScene1 
        ? { video_1_url: publicUrl }
        : { video_2_url: publicUrl };

      // Check if both videos are now complete
      const { data: updatedGen } = await supabase
        .from('ugc_generations')
        .update(updateData)
        .eq('id', generation.id)
        .select()
        .single();

      if (updatedGen) {
        const video1Ready = isScene1 ? publicUrl : updatedGen.video_1_url;
        const video2Ready = !isScene1 ? publicUrl : updatedGen.video_2_url;

        if (video1Ready && video2Ready) {
          // Both videos are complete
          await supabase
            .from('ugc_generations')
            .update({
              status: 'completed',
              current_step: 6,
              completed_at: new Date().toISOString(),
              cost_usd: 0.48 // Estimated cost
            })
            .eq('id', generation.id);

          console.log('Both videos complete! Generation finished:', generation.id);
        } else {
          console.log('One video complete, waiting for the other');
        }
      }
    } else if (status === 'failed') {
      // Handle failure
      await supabase
        .from('ugc_generations')
        .update({
          status: 'failed',
          error_message: payload.error || 'Video generation failed'
        })
        .eq('id', generation.id);

      console.log('Video generation failed:', payload.error);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in kie-ugc-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
