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
    const { tiktokUrl, proxyDownload } = await req.json();
    
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

    // Call Tiktok Download Video API (llbbmm)
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
      console.error(`[get-tiktok-download-url] RapidAPI error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch video from API', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[get-tiktok-download-url] API response:`, JSON.stringify(rapidApiData).substring(0, 500));

    // Extract MP4 URL from llbbmm API response
    let mp4Url = rapidApiData.data?.play || rapidApiData.data?.hdplay || rapidApiData.data?.wmplay || rapidApiData.downloadUrl || rapidApiData.url;

    if (!mp4Url) {
      console.error(`[get-tiktok-download-url] No MP4 URL in response:`, rapidApiData);
      return new Response(
        JSON.stringify({ error: 'No video URL found in API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-tiktok-download-url] Download URL: ${mp4Url}`);

    // If proxyDownload is true, download the video and return the bytes directly
    if (proxyDownload) {
      console.log(`[get-tiktok-download-url] Proxying download...`);
      
      const videoResponse = await fetch(mp4Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!videoResponse.ok) {
        console.error(`[get-tiktok-download-url] Failed to download video: ${videoResponse.status}`);
        return new Response(
          JSON.stringify({ error: 'Failed to download video' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const contentLength = videoBuffer.byteLength;
      console.log(`[get-tiktok-download-url] Video downloaded: ${contentLength} bytes`);

      const title = rapidApiData.data?.title || rapidApiData.title || rapidApiData.data?.author?.nickname || 'tiktok-video';
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.mp4`;

      return new Response(videoBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': contentLength.toString(),
        }
      });
    }

    // Otherwise return the download URL for the client to handle
    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: mp4Url,
        title: rapidApiData.data?.title || rapidApiData.title || rapidApiData.data?.author?.nickname || 'tiktok-video'
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
