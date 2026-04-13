import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DOWNLOAD_ATTEMPTS = 5;

function isQuotaExceeded(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('exceeded') && (lower.includes('quota') || lower.includes('limit')) ||
    lower.includes('upgrade your plan') ||
    lower.includes('monthly quota') ||
    lower.includes('rate limit');
}

async function downloadSingleVideo(
  videoId: string,
  tiktokUrl: string,
  rapidApiKey: string,
  supabase: any,
  currentAttempts: number
): Promise<{ success: boolean; error?: string; permanentlyFailed?: boolean; quotaExceeded?: boolean }> {
  try {
    console.log(`[download] Starting: ${videoId} (attempt ${currentAttempts + 1}/${MAX_DOWNLOAD_ATTEMPTS})`);
    
    await supabase.from('videos').update({ processing_status: 'downloading' }).eq('id', videoId);

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
      
      // Quota exceeded — don't increment attempts, mark as blocked
      if (isQuotaExceeded(errorText) || rapidApiResponse.status === 429) {
        console.log(`[download] ⚠️ QUOTA EXCEEDED — stopping batch`);
        await supabase.from('videos').update({ 
          processing_status: 'download_blocked_quota'
        }).eq('id', videoId);
        return { success: false, error: 'Quota exceeded', quotaExceeded: true };
      }
      
      return await handleDownloadFailure(supabase, videoId, currentAttempts, 'RapidAPI request failed');
    }

    const rapidApiData = await rapidApiResponse.json();
    console.log(`[download] API response for ${videoId}:`, JSON.stringify(rapidApiData).substring(0, 300));
    
    // Check quota in response body
    const responseStr = JSON.stringify(rapidApiData);
    if (isQuotaExceeded(responseStr)) {
      console.log(`[download] ⚠️ QUOTA EXCEEDED in response body — stopping batch`);
      await supabase.from('videos').update({ 
        processing_status: 'download_blocked_quota'
      }).eq('id', videoId);
      return { success: false, error: 'Quota exceeded', quotaExceeded: true };
    }

    const mp4Url = rapidApiData.data?.play || rapidApiData.data?.hdplay || rapidApiData.data?.wmplay || rapidApiData.downloadUrl || rapidApiData.url;

    if (!mp4Url) {
      console.error(`[download] No MP4 URL in response for ${videoId}`);
      return await handleDownloadFailure(supabase, videoId, currentAttempts, 'No MP4 URL in API response');
    }

    const videoResponse = await fetch(mp4Url, {
      signal: AbortSignal.timeout(60000)
    });
    if (!videoResponse.ok) {
      return await handleDownloadFailure(supabase, videoId, currentAttempts, `MP4 fetch failed: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download] Downloaded ${videoId}: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    const fileName = `${videoId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      return await handleDownloadFailure(supabase, videoId, currentAttempts, uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

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

async function handleDownloadFailure(
  supabase: any, 
  videoId: string, 
  currentAttempts: number, 
  errorMessage: string
): Promise<{ success: boolean; error: string; permanentlyFailed?: boolean }> {
  const newAttempts = currentAttempts + 1;
  
  if (newAttempts >= MAX_DOWNLOAD_ATTEMPTS) {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: roleData } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { 
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;

    // Reset stuck 'downloading' videos
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

    // Get pending videos — also include download_blocked_quota for retry
    const { data: pendingVideos, error: queryError } = await supabase
      .from('videos')
      .select('id, video_url, revenue_mxn, download_attempts')
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'downloading', 'download_failed', 'no_mp4_url', 'download_blocked_quota'])
      .lt('download_attempts', MAX_DOWNLOAD_ATTEMPTS)
      .order('revenue_mxn', { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!pendingVideos || pendingVideos.length === 0) {
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

    const results = [];
    let permanentlyFailedCount = 0;
    let quotaHit = false;
    
    for (const video of pendingVideos) {
      // If quota was hit, mark remaining videos as blocked without calling API
      if (quotaHit) {
        await supabase.from('videos').update({ 
          processing_status: 'download_blocked_quota'
        }).eq('id', video.id);
        results.push({ id: video.id, success: false, error: 'Quota exceeded', quotaExceeded: true });
        continue;
      }

      const result = await downloadSingleVideo(
        video.id,
        video.video_url,
        rapidApiKey,
        supabase,
        video.download_attempts || 0
      );
      results.push({ id: video.id, ...result });
      
      if (result.quotaExceeded) {
        quotaHit = true;
        console.log(`[batch] ⚠️ Quota exceeded — skipping remaining videos in batch`);
        continue;
      }
      
      if (result.permanentlyFailed) {
        permanentlyFailedCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success && !r.quotaExceeded).length;

    const { count: remainingCount } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('video_mp4_url', null)
      .in('processing_status', ['pending', 'downloading', 'download_failed', 'no_mp4_url', 'download_blocked_quota'])
      .lt('download_attempts', MAX_DOWNLOAD_ATTEMPTS);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingVideos.length,
        successful: successCount,
        failed: failCount,
        permanentlyFailed: permanentlyFailedCount,
        remaining: remainingCount || 0,
        quotaExceeded: quotaHit,
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
