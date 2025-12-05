import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Download a single video from TikTok
async function downloadSingleVideo(
  videoId: string,
  tiktokUrl: string,
  rapidApiKey: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[download] Starting: ${videoId}`);
    
    // Update status to downloading
    await supabase.from('videos').update({ processing_status: 'downloading' }).eq('id', videoId);

    // Call RapidAPI TikTok Video No Watermark API
    const rapidApiResponse = await fetch(
      `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(tiktokUrl)}&hd=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      }
    );

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text();
      console.error(`[download] RapidAPI error: ${errorText}`);
      await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
      return { success: false, error: 'RapidAPI request failed' };
    }

    const rapidApiData = await rapidApiResponse.json();
    
    // Extract MP4 URL from response
    const mp4Url = rapidApiData.data?.hdplay || 
                   rapidApiData.data?.play || 
                   rapidApiData.data?.wmplay;

    if (!mp4Url) {
      console.error(`[download] No MP4 URL in response for ${videoId}`);
      await supabase.from('videos').update({ processing_status: 'no_mp4_url' }).eq('id', videoId);
      return { success: false, error: 'No MP4 URL in API response' };
    }

    console.log(`[download] Got MP4 URL for ${videoId}`);

    // Download the video file
    const videoResponse = await fetch(mp4Url);
    if (!videoResponse.ok) {
      await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
      return { success: false, error: 'Failed to download MP4 file' };
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download] Downloaded ${videoId}: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase Storage
    const fileName = `${videoId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error(`[download] Upload error: ${uploadError.message}`);
      await supabase.from('videos').update({ processing_status: 'upload_failed' }).eq('id', videoId);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Update database with success
    await supabase
      .from('videos')
      .update({ 
        video_mp4_url: publicUrlData.publicUrl,
        processing_status: 'downloaded'
      })
      .eq('id', videoId);

    console.log(`[download] ✓ Complete: ${videoId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[download] Error for ${videoId}:`, error.message);
    await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";

    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get batch size from request or default to 5
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;

    // Get pending videos that need download - PRIORITIZE by revenue (top sellers first)
    const { data: pendingVideos, error: queryError } = await supabase
      .from('videos')
      .select('id, video_url, revenue_mxn')
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'download_failed', 'no_mp4_url'])
      .order('revenue_mxn', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!pendingVideos || pendingVideos.length === 0) {
      // Get status counts
      const { data: statusCounts } = await supabase
        .from('videos')
        .select('processing_status');

      const counts = statusCounts?.reduce((acc: any, v: any) => {
        acc[v.processing_status] = (acc[v.processing_status] || 0) + 1;
        return acc;
      }, {}) || {};

      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending videos to download",
          processed: 0,
          status_counts: counts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch] Processing ${pendingVideos.length} videos`);

    // Process each video in the batch
    const results = [];
    for (const video of pendingVideos) {
      const result = await downloadSingleVideo(
        video.id,
        video.video_url,
        rapidApiKey,
        supabase
      );
      results.push({ id: video.id, ...result });
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Get remaining count
    const { count: remainingCount } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'download_failed', 'no_mp4_url']);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingVideos.length,
        successful: successCount,
        failed: failCount,
        remaining: remainingCount || 0,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Batch download error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
