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
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { generatedVideoId } = await req.json();

    if (!generatedVideoId) {
      throw new Error("generatedVideoId is required");
    }

    // Get the generated video record
    const { data: generatedVideo, error: findError } = await supabaseAdmin
      .from("generated_videos")
      .select("*")
      .eq("id", generatedVideoId)
      .eq("user_id", user.id)
      .single();

    if (findError || !generatedVideo) {
      throw new Error("Video not found");
    }

    // If already completed or failed, return current status
    if (generatedVideo.status !== "processing") {
      return new Response(
        JSON.stringify({
          id: generatedVideo.id,
          status: generatedVideo.status,
          videoUrl: generatedVideo.video_url,
          errorMessage: generatedVideo.error_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Poll Kie.ai for status
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_API_KEY not configured");
    }

    const kieResponse = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${generatedVideo.kie_task_id}`,
      {
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
        },
      }
    );

    const kieData = await kieResponse.json();
    console.log(`Kie.ai status for ${generatedVideo.kie_task_id}:`, kieData);

    if (kieData.code !== 200 || !kieData.data) {
      throw new Error(`Kie.ai error: ${kieData.msg || "Unknown error"}`);
    }

    const taskState = kieData.data.state;

    if (taskState === "success") {
      // Parse result to get video URL
      let videoUrl = null;
      try {
        const result = typeof kieData.data.resultJson === "string" 
          ? JSON.parse(kieData.data.resultJson) 
          : kieData.data.resultJson;
        videoUrl = result?.resultUrls?.[0] || null;
      } catch (e) {
        console.error("Error parsing resultJson:", e);
      }

      if (videoUrl) {
        // Update database
        await supabaseAdmin
          .from("generated_videos")
          .update({
            status: "completed",
            video_url: videoUrl,
          })
          .eq("id", generatedVideo.id);

        return new Response(
          JSON.stringify({
            id: generatedVideo.id,
            status: "completed",
            videoUrl,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (taskState === "fail") {
      const errorMsg = kieData.data.failMsg || "Generation failed";
      
      // Update database
      await supabaseAdmin
        .from("generated_videos")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", generatedVideo.id);

      // Refund credits
      await refundCredits(generatedVideo.user_id, generatedVideo.duration_seconds);

      return new Response(
        JSON.stringify({
          id: generatedVideo.id,
          status: "failed",
          errorMessage: errorMsg,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Still processing
    return new Response(
      JSON.stringify({
        id: generatedVideo.id,
        status: "processing",
        kieState: taskState,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
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