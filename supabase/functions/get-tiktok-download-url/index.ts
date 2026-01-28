import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tiktokUrl } = await req.json();
    
    if (!tiktokUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing tiktokUrl' }),
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

    console.log(`[get-tiktok-download-url] Processing URL: ${tiktokUrl}`);

    // Call TikTok Video Downloader API (elisbushaj2)
    const rapidApiResponse = await fetch(
      `https://tiktok-video-downloader-api.p.rapidapi.com/media?videoUrl=${encodeURIComponent(tiktokUrl)}`,
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
      console.error(`[get-tiktok-download-url] RapidAPI error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video from API', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[get-tiktok-download-url] API response:`, JSON.stringify(rapidApiData).substring(0, 500));

    // Extract MP4 URL from elisbushaj2 API response
    const mp4Url = rapidApiData.downloadUrl || rapidApiData.video?.downloadUrl || rapidApiData.url;

    if (!mp4Url) {
      console.error(`[get-tiktok-download-url] No MP4 URL in response:`, rapidApiData);
      return new Response(
        JSON.stringify({ error: 'No video URL found in API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-tiktok-download-url] MP4 URL found: ${mp4Url}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: mp4Url,
        title: rapidApiData.title || 'tiktok-video'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[get-tiktok-download-url] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
