import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isQuotaExceeded(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('exceeded') && (lower.includes('quota') || lower.includes('limit')) ||
    lower.includes('upgrade your plan') ||
    lower.includes('monthly quota') ||
    lower.includes('rate limit');
}

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

    const rapidApiResponse = await fetch(
      `https://tiktok-download-video1.p.rapidapi.com/getVideo?url=${encodeURIComponent(tiktokUrl)}&hd=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'tiktok-download-video1.p.rapidapi.com'
        }
      }
    );

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text();
      console.error(`[download-tiktok-video] RapidAPI error: ${errorText}`);
      
      if (isQuotaExceeded(errorText) || rapidApiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Cuota mensual agotada',
            quotaExceeded: true,
            retryable: false
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video from RapidAPI', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[download-tiktok-video] RapidAPI response:`, JSON.stringify(rapidApiData).substring(0, 500));

    // Check for quota errors in response body
    const responseStr = JSON.stringify(rapidApiData);
    if (isQuotaExceeded(responseStr)) {
      return new Response(
        JSON.stringify({
          error: 'Cuota mensual agotada',
          quotaExceeded: true,
          retryable: false
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let mp4Url = rapidApiData.data?.play || rapidApiData.data?.hdplay || rapidApiData.data?.wmplay || rapidApiData.downloadUrl || rapidApiData.url;

    if (!mp4Url) {
      return new Response(
        JSON.stringify({ error: 'No video URL in RapidAPI response', data: rapidApiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoResponse = await fetch(mp4Url);
    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download video from MP4 URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download-tiktok-video] Video downloaded, size: ${videoBuffer.byteLength} bytes`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${videoId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload video to storage', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const videoMp4Url = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('videos')
      .update({ 
        video_mp4_url: videoMp4Url,
        processing_status: 'downloaded'
      })
      .eq('id', videoId);

    if (updateError) {
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
