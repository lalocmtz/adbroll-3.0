import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Credits required per duration for refunds
const DURATION_CREDITS: Record<number, number> = {
  10: 1,
  15: 1,
  25: 2,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Lip-sync callback received:", JSON.stringify(payload, null, 2));

    // Extract data from callback
    // Kie.ai callback format: { taskId, state, videoInfo, failMsg }
    const { taskId, state, videoInfo, failMsg } = payload;

    if (!taskId) {
      console.error("No taskId in callback");
      return new Response(
        JSON.stringify({ error: "taskId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the generated video record
    const { data: generatedVideo, error: findError } = await supabaseAdmin
      .from("generated_videos")
      .select("*")
      .eq("kie_task_id", taskId)
      .single();

    if (findError || !generatedVideo) {
      console.error("Video not found for taskId:", taskId);
      return new Response(
        JSON.stringify({ error: "Video record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing callback for video ${generatedVideo.id}, state: ${state}`);

    if (state === "success") {
      // Extract video URL from videoInfo
      const videoUrl = videoInfo?.videoUrl || videoInfo?.video_url || null;

      if (videoUrl) {
        // Update database with success
        await supabaseAdmin
          .from("generated_videos")
          .update({
            status: "completed",
            video_url: videoUrl,
          })
          .eq("id", generatedVideo.id);

        console.log(`✓ Lip-sync video completed: ${generatedVideo.id}, URL: ${videoUrl}`);
      } else {
        console.error("No video URL in success callback:", videoInfo);
        // Mark as failed if no URL
        await supabaseAdmin
          .from("generated_videos")
          .update({
            status: "failed",
            error_message: "No video URL received",
          })
          .eq("id", generatedVideo.id);

        // Refund credits
        await refundCredits(generatedVideo.user_id, generatedVideo.duration_seconds);
      }
    } else if (state === "fail") {
      const errorMessage = failMsg || "Lip-sync generation failed";
      console.error(`✗ Lip-sync video failed: ${generatedVideo.id}, error: ${errorMessage}`);

      // Update database with failure
      await supabaseAdmin
        .from("generated_videos")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", generatedVideo.id);

      // Refund credits
      await refundCredits(generatedVideo.user_id, generatedVideo.duration_seconds);
    } else {
      console.log(`Task ${taskId} still processing, state: ${state}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refundCredits(userId: string, durationSeconds: number) {
  const creditsToRefund = DURATION_CREDITS[durationSeconds] || 1;

  const { data: credits } = await supabaseAdmin
    .from("video_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (credits) {
    const newUsed = Math.max(0, credits.credits_used - creditsToRefund);
    await supabaseAdmin
      .from("video_credits")
      .update({ 
        credits_used: newUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    console.log(`Refunded ${creditsToRefund} credit(s) to user ${userId}`);
  }
}
