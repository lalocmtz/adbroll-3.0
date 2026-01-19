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
    
    // Log the full payload for debugging
    console.log('KIE UGC callback - Raw payload:', JSON.stringify(payload, null, 2));

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // KIE sends data in different structures - handle both
    const kieData = payload.data || payload;
    
    // Extract taskId - KIE nests it under data.taskId
    const taskId = kieData.taskId || kieData.task_id || payload.taskId || payload.task_id;
    
    // Extract status - KIE uses "state" with values like "success", "failed"
    const rawState = kieData.state || payload.status || payload.state;
    const status = rawState === 'success' ? 'completed' : rawState;
    
    // Extract video URL from resultJson (KIE sends it as a JSON string)
    let videoUrl: string | null = null;
    const resultJsonSource = kieData.resultJson || payload.resultJson;
    if (resultJsonSource) {
      try {
        const resultData = typeof resultJsonSource === 'string' 
          ? JSON.parse(resultJsonSource) 
          : resultJsonSource;
        videoUrl = resultData.resultUrls?.[0] || resultData.video_url || resultData.url;
      } catch (e) {
        console.error('Failed to parse resultJson:', e, 'Raw value:', resultJsonSource);
      }
    }
    
    // Fallback: check direct video URL locations
    if (!videoUrl) {
      videoUrl = kieData.output?.video_url || 
                 kieData.result?.video_url || 
                 payload.output?.video_url ||
                 payload.result?.video_url ||
                 payload.video_url;
    }

    // Extract metadata from param (KIE sends it as JSON string)
    let generationId: string | undefined;
    let scene: string | undefined;
    
    const paramSource = kieData.param || payload.param || payload.metadata;
    if (paramSource) {
      try {
        const paramData = typeof paramSource === 'string' 
          ? JSON.parse(paramSource) 
          : paramSource;
        // Metadata might be nested
        const metadata = paramData.metadata || paramData;
        generationId = metadata.generationId;
        scene = metadata.scene;
      } catch (e) {
        console.error('Failed to parse param/metadata:', e, 'Raw value:', paramSource);
      }
    }
    
    // Also check direct metadata field
    if (!generationId && payload.metadata) {
      generationId = payload.metadata.generationId;
      scene = payload.metadata.scene;
    }

    console.log('Extracted values:', { taskId, status, videoUrl, generationId, scene });

    if (!taskId && !generationId) {
      console.error('No taskId or generationId in callback');
      return new Response(
        JSON.stringify({ error: 'No taskId or generationId provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the generation - try multiple methods
    let generation;
    
    // Method 1: Direct lookup by generationId
    if (generationId) {
      console.log('Looking up generation by ID:', generationId);
      const { data } = await supabase
        .from('ugc_generations')
        .select('*')
        .eq('id', generationId)
        .single();
      generation = data;
    }
    
    // Method 2: Search by task ID if generationId didn't work
    if (!generation && taskId) {
      console.log('Looking up generation by task ID:', taskId);
      const { data } = await supabase
        .from('ugc_generations')
        .select('*')
        .or(`video_1_task_id.eq.${taskId},video_2_task_id.eq.${taskId}`)
        .single();
      generation = data;
    }

    if (!generation) {
      console.error('Generation not found for task:', taskId, 'or generationId:', generationId);
      return new Response(
        JSON.stringify({ error: 'Generation not found', taskId, generationId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found generation:', generation.id, 'Status:', status);

    if (status === 'completed' && videoUrl) {
      console.log('Downloading video from:', videoUrl);
      
      // Download the video and upload to our storage
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video from KIE: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const timestamp = Date.now();
      
      // Determine which scene this is
      const isScene1 = scene === 'scene_1' || generation.video_1_task_id === taskId;
      const sceneName = isScene1 ? 'scene1' : 'scene2';
      const fileName = `ugc/${generation.id}/${sceneName}_${timestamp}.mp4`;

      console.log('Uploading video to storage:', fileName);

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
      console.log('Video uploaded successfully:', publicUrl);

      // Update the correct video URL
      const updateData: Record<string, unknown> = isScene1 
        ? { video_1_url: publicUrl }
        : { video_2_url: publicUrl };

      // Update and check if both videos are now complete
      const { data: updatedGen, error: updateError } = await supabase
        .from('ugc_generations')
        .update(updateData)
        .eq('id', generation.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating generation:', updateError);
      }

      if (updatedGen) {
        const video1Ready = isScene1 ? publicUrl : updatedGen.video_1_url;
        const video2Ready = !isScene1 ? publicUrl : updatedGen.video_2_url;

        console.log('Video status:', { video1Ready: !!video1Ready, video2Ready: !!video2Ready });

        if (video1Ready && video2Ready) {
          // Both videos are complete
          await supabase
            .from('ugc_generations')
            .update({
              status: 'completed',
              current_step: 6,
              completed_at: new Date().toISOString(),
              cost_usd: 0.48
            })
            .eq('id', generation.id);

          console.log('Both videos complete! Generation finished:', generation.id);
        } else {
          console.log('One video complete, waiting for the other');
        }
      }
    } else if (status === 'failed' || rawState === 'failed') {
      // Handle failure
      const errorMsg = kieData.error || payload.error || 'Video generation failed';
      console.log('Video generation failed:', errorMsg);
      
      await supabase
        .from('ugc_generations')
        .update({
          status: 'failed',
          error_message: errorMsg
        })
        .eq('id', generation.id);
    } else {
      console.log('Callback received with status:', status, '- no action taken');
    }

    return new Response(
      JSON.stringify({ success: true, processed: { taskId, generationId, status } }),
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
