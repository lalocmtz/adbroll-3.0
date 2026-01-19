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
    const { image_1_url, image_2_url, generationId } = await req.json();

    if (!image_1_url || !image_2_url || !generationId) {
      return new Response(
        JSON.stringify({ error: 'Image URLs and generation ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!KIE_API_KEY) {
      throw new Error('KIE_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Generating UGC videos for generation:', generationId);

    // Callback URL for KIE to notify when videos are ready
    const callbackUrl = `${SUPABASE_URL}/functions/v1/kie-ugc-callback`;

    // Generate Video 1 - Talking to camera (subtle movement)
    const video1Response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'wan/2-6-image-to-video',
        callBackUrl: callbackUrl,
        input: {
          prompt: 'Subtle natural head and shoulder movement, person speaking to camera confidently, slight smile, blinking naturally, gentle body sway, authentic UGC content creator vibe',
          image_urls: [image_1_url],
          duration: '5',
          resolution: '720p'
        },
        metadata: {
          generationId,
          scene: 'scene_1'
        }
      }),
    });

    if (!video1Response.ok) {
      const errorText = await video1Response.text();
      console.error('KIE API error for video 1:', errorText);
      throw new Error(`KIE API error for video 1: ${video1Response.status}`);
    }

    const video1Data = await video1Response.json();
    const video1TaskId = video1Data.taskId || video1Data.task_id;

    console.log('Video 1 task created:', video1TaskId);

    // Generate Video 2 - Walking/showing product
    const video2Response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'wan/2-6-image-to-video',
        callBackUrl: callbackUrl,
        input: {
          prompt: 'Person walking slowly and confidently, turning slightly to show outfit/product, fabric moving naturally with the walk, lifestyle content, smooth natural movement',
          image_urls: [image_2_url],
          duration: '5',
          resolution: '720p'
        },
        metadata: {
          generationId,
          scene: 'scene_2'
        }
      }),
    });

    if (!video2Response.ok) {
      const errorText = await video2Response.text();
      console.error('KIE API error for video 2:', errorText);
      throw new Error(`KIE API error for video 2: ${video2Response.status}`);
    }

    const video2Data = await video2Response.json();
    const video2TaskId = video2Data.taskId || video2Data.task_id;

    console.log('Video 2 task created:', video2TaskId);

    // Update the generation record with task IDs
    const { error: updateError } = await supabase
      .from('ugc_generations')
      .update({
        video_1_task_id: video1TaskId,
        video_2_task_id: video2TaskId,
        current_step: 4,
        status: 'processing_videos'
      })
      .eq('id', generationId);

    if (updateError) {
      console.error('Error updating generation:', updateError);
    }

    return new Response(
      JSON.stringify({
        video_1_task_id: video1TaskId,
        video_2_task_id: video2TaskId,
        status: 'processing',
        message: 'Video generation started. Will receive callback when complete.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-ugc-videos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
