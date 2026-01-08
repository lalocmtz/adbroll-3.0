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
    console.log("Kie.ai callback received:", JSON.stringify(payload, null, 2));

    // Extract task info from Kie.ai callback
    // Callback structure matches Query Task API response
    const taskId = payload.data?.taskId || payload.taskId;
    const state = payload.data?.state || payload.state;
    const resultJson = payload.data?.resultJson || payload.resultJson;
    const failMsg = payload.data?.failMsg || payload.failMsg;

    if (!taskId) {
      console.error("No taskId in callback payload");
      return new Response(
        JSON.stringify({ error: "No taskId provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing callback for task ${taskId}, state: ${state}`);

    // Find the generated video record
    const { data: generatedVideo, error: findError } = await supabaseAdmin
      .from("generated_videos")
      .select("*")
      .eq("kie_task_id", taskId)
      .single();

    if (findError || !generatedVideo) {
      console.error(`No generated video found for task ${taskId}:`, findError);
      return new Response(
        JSON.stringify({ error: "Video record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (state === "success") {
      // Parse result JSON to get video URL
      let videoUrl = null;
      try {
        const result = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
        videoUrl = result?.resultUrls?.[0] || null;
      } catch (e) {
        console.error("Error parsing resultJson:", e);
      }

      if (!videoUrl) {
        console.error("No video URL in success response");
        // Update as failed
        await supabaseAdmin
          .from("generated_videos")
          .update({
            status: "failed",
            error_message: "No video URL returned from Kie.ai",
          })
          .eq("id", generatedVideo.id);

        // Refund credits
        await refundCredits(generatedVideo.user_id, generatedVideo.duration_seconds);

        return new Response(
          JSON.stringify({ error: "No video URL in response" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update video record with success
      await supabaseAdmin
        .from("generated_videos")
        .update({
          status: "completed",
          video_url: videoUrl,
        })
        .eq("id", generatedVideo.id);

      console.log(`Video generation completed for ${generatedVideo.id}: ${videoUrl}`);

    } else if (state === "fail") {
      // Update video record with failure
      await supabaseAdmin
        .from("generated_videos")
        .update({
          status: "failed",
          error_message: failMsg || "Video generation failed",
        })
        .eq("id", generatedVideo.id);

      // Refund credits
      await refundCredits(generatedVideo.user_id, generatedVideo.duration_seconds);

      console.log(`Video generation failed for ${generatedVideo.id}: ${failMsg}`);
    } else {
      console.log(`Task ${taskId} still processing, state: ${state}`);
    }

    return new Response(
      JSON.stringify({ success: true, taskId, state }),
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