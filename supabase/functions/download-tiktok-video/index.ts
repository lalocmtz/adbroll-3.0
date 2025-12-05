import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tiktokUrl, videoId } = await req.json();
    
    if (!tiktokUrl || !videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing tiktokUrl or videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    if (!RAPIDAPI_KEY) {
      return new Response(
        JSON.stringify({ error: 'RAPIDAPI_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[download-tiktok-video] Processing video: ${videoId}`);
    console.log(`[download-tiktok-video] TikTok URL: ${tiktokUrl}`);

    // Call RapidAPI to get direct MP4 URL
    const rapidApiResponse = await fetch(
      `https://tiktok-video-downloader-api.p.rapidapi.com/v1/getvideo?url=${encodeURIComponent(tiktokUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'tiktok-video-downloader-api.p.rapidapi.com'
        }
      }
    );

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text();
      console.error(`[download-tiktok-video] RapidAPI error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video from RapidAPI', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[download-tiktok-video] RapidAPI response:`, JSON.stringify(rapidApiData));

    // Extract MP4 URL from response - handle different response structures
    let mp4Url = rapidApiData.video_url || 
                 rapidApiData.data?.play || 
                 rapidApiData.data?.wmplay ||
                 rapidApiData.data?.hdplay ||
                 rapidApiData.play ||
                 rapidApiData.hdplay;

    if (!mp4Url) {
      console.error(`[download-tiktok-video] No MP4 URL in response:`, rapidApiData);
      return new Response(
        JSON.stringify({ error: 'No video URL in RapidAPI response', data: rapidApiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[download-tiktok-video] MP4 URL found: ${mp4Url}`);

    // Download the video
    const videoResponse = await fetch(mp4Url);
    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download video from MP4 URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download-tiktok-video] Video downloaded, size: ${videoBuffer.byteLength} bytes`);

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${videoId}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error(`[download-tiktok-video] Upload error:`, uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload video to storage', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const videoMp4Url = publicUrlData.publicUrl;
    console.log(`[download-tiktok-video] Video uploaded: ${videoMp4Url}`);

    // Update database with new video URL
    const { error: updateError } = await supabase
      .from('videos')
      .update({ 
        video_mp4_url: videoMp4Url,
        processing_status: 'downloaded'
      })
      .eq('id', videoId);

    if (updateError) {
      console.error(`[download-tiktok-video] DB update error:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        video_mp4_url: videoMp4Url,
        message: 'Video downloaded and uploaded successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[download-tiktok-video] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
