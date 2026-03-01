import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DOWNLOAD_ATTEMPTS = 5;

// Download a single video from TikTok
async function downloadSingleVideo(
  videoId: string,
  tiktokUrl: string,
  rapidApiKey: string,
  supabase: any,
  currentAttempts: number
): Promise<{ success: boolean; error?: string; permanentlyFailed?: boolean }> {
  try {
    console.log(`[download] Starting: ${videoId} (attempt ${currentAttempts + 1}/${MAX_DOWNLOAD_ATTEMPTS})`);
    
    // Update status to downloading
    await supabase.from('videos').update({ processing_status: 'downloading' }).eq('id', videoId);

    // Call Tiktok Download Video API (llbbmm)
    const rapidApiResponse = await fetch(
      `https://tiktok-download-video1.p.rapidapi.com/getVideo?url=${encodeURIComponent(tiktokUrl)}&hd=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'tiktok-download-video1.p.rapidapi.com'
        }
      }
    );

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text();
      console.error(`[download] RapidAPI error for ${videoId}: ${errorText}`);
      return await handleDownloadFailure(supabase, videoId, currentAttempts, 'RapidAPI request failed');
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[download] API response for ${videoId}:`, JSON.stringify(rapidApiData).substring(0, 300));
    
    // Extract MP4 URL from llbbmm API response
    const mp4Url = rapidApiData.data?.play || rapidApiData.data?.hdplay || rapidApiData.data?.wmplay || rapidApiData.downloadUrl || rapidApiData.url;

    if (!mp4Url) {
      console.error(`[download] No MP4 URL in response for ${videoId}`);
      return await handleDownloadFailure(supabase, videoId, currentAttempts, 'No MP4 URL in API response');
    }

    console.log(`[download] Got MP4 URL for ${videoId}`);

    // Download the video file with 60s timeout
    const videoResponse = await fetch(mp4Url, {
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });
    if (!videoResponse.ok) {
      console.error(`[download] MP4 fetch failed for ${videoId}: ${videoResponse.status} ${videoResponse.statusText}`);
      return await handleDownloadFailure(supabase, videoId, currentAttempts, `MP4 fetch failed: ${videoResponse.status}`);
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
      return await handleDownloadFailure(supabase, videoId, currentAttempts, uploadError.message);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Update database with success - reset attempts on success
    await supabase
      .from('videos')
      .update({ 
        video_mp4_url: publicUrlData.publicUrl,
        processing_status: 'downloaded',
        download_attempts: 0
      })
      .eq('id', videoId);

    console.log(`[download] ✓ Complete: ${videoId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[download] Error for ${videoId}:`, error.message);
    return await handleDownloadFailure(supabase, videoId, currentAttempts, error.message);
  }
}

// Handle download failure with attempt tracking
async function handleDownloadFailure(
  supabase: any, 
  videoId: string, 
  currentAttempts: number, 
  errorMessage: string
): Promise<{ success: boolean; error: string; permanentlyFailed?: boolean }> {
  const newAttempts = currentAttempts + 1;
  
  if (newAttempts >= MAX_DOWNLOAD_ATTEMPTS) {
    // Mark as permanently failed - won't be retried
    console.log(`[download] ⛔ Video ${videoId} permanently failed after ${newAttempts} attempts`);
    await supabase
      .from('videos')
      .update({ 
        processing_status: 'permanently_failed',
        download_attempts: newAttempts
      })
      .eq('id', videoId);
    return { success: false, error: errorMessage, permanentlyFailed: true };
  }
  
  // Mark as failed but can retry
  await supabase
    .from('videos')
    .update({ 
      processing_status: 'download_failed',
      download_attempts: newAttempts
    })
    .eq('id', videoId);
  
  console.log(`[download] ❌ Video ${videoId} failed (attempt ${newAttempts}/${MAX_DOWNLOAD_ATTEMPTS})`);
  return { success: false, error: errorMessage };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";

    // Admin-only authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check if user has founder role
    const { data: roleData } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get batch size from request or default to 5
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;

    // Reset videos stuck in 'downloading' status for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: resetVideos } = await supabase
      .from('videos')
      .update({ processing_status: 'pending' })
      .eq('processing_status', 'downloading')
      .lt('imported_at', fiveMinutesAgo)
      .select('id');
    
    if (resetVideos && resetVideos.length > 0) {
      console.log(`[batch] Reset ${resetVideos.length} stuck 'downloading' videos to pending`);
    }

    // Get pending videos that need download
    // EXCLUDE videos with >= MAX_DOWNLOAD_ATTEMPTS (they're permanently failed)
    const { data: pendingVideos, error: queryError } = await supabase
      .from('videos')
      .select('id, video_url, revenue_mxn, download_attempts')
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'downloading', 'download_failed', 'no_mp4_url'])
      .lt('download_attempts', MAX_DOWNLOAD_ATTEMPTS)
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
          remaining: 0,
          status_counts: counts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch] Processing ${pendingVideos.length} videos`);

    // Process each video in the batch
    const results = [];
    let permanentlyFailedCount = 0;
    
    for (const video of pendingVideos) {
      const result = await downloadSingleVideo(
        video.id,
        video.video_url,
        rapidApiKey,
        supabase,
        video.download_attempts || 0
      );
      results.push({ id: video.id, ...result });
      
      if (result.permanentlyFailed) {
        permanentlyFailedCount++;
      }
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Get remaining count (exclude permanently_failed and those with max attempts)
    const { count: remainingCount } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'downloading', 'download_failed', 'no_mp4_url'])
      .lt('download_attempts', MAX_DOWNLOAD_ATTEMPTS);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingVideos.length,
        successful: successCount,
        failed: failCount,
        permanentlyFailed: permanentlyFailedCount,
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
