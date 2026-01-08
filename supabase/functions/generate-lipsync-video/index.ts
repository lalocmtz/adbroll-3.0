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

// Credits required per duration (in seconds)
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

    const { 
      imageUrl, 
      audioUrl, 
      productName,
      duration,
      videoId,
    } = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }
    if (!audioUrl) {
      throw new Error("audioUrl is required (ElevenLabs audio URL)");
    }

    // Validate duration
    const durationSeconds = parseInt(duration) || 15;
    const creditsRequired = DURATION_CREDITS[durationSeconds] || 1;

    console.log(`Generating lip-sync video: duration=${durationSeconds}s, credits=${creditsRequired}`);

    // Check user credits
    const { data: userCredits } = await supabaseAdmin
      .from("video_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const availableCredits = userCredits 
      ? (userCredits.credits_total || 0) - (userCredits.credits_used || 0)
      : 0;

    if (availableCredits < creditsRequired) {
      throw new Error(`Créditos insuficientes. Necesitas ${creditsRequired}, tienes ${availableCredits}`);
    }

    // Get Kie.ai API key
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_API_KEY not configured");
    }

    // Build prompt for InfiniteTalk
    const prompt = `Young Latin American content creator talking naturally to camera in a casual home setting. 
The person appears friendly and enthusiastic while presenting ${productName || 'a product'}. 
Natural facial expressions, subtle head movements, authentic TikTok UGC style. 
Professional lighting, iPhone-quality video aesthetic.`;

    console.log("Calling Kie.ai InfiniteTalk API with:", { imageUrl, audioUrl: audioUrl.substring(0, 50) + "...", prompt });

    // Call Kie.ai InfiniteTalk API
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const callbackUrl = `${SUPABASE_URL}/functions/v1/lipsync-callback`;

    const kiePayload = {
      model: "infinitalk/from-audio",
      callBackUrl: callbackUrl,
      input: {
        image_url: imageUrl,
        audio_url: audioUrl,
        prompt: prompt,
        resolution: "720p",
      }
    };

    console.log("Kie.ai payload:", JSON.stringify(kiePayload, null, 2));

    const kieResponse = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kiePayload),
    });

    const kieData = await kieResponse.json();
    console.log("Kie.ai response:", kieData);

    if (kieData.code !== 200 || !kieData.data?.taskId) {
      throw new Error(`Kie.ai error: ${kieData.msg || JSON.stringify(kieData)}`);
    }

    const taskId = kieData.data.taskId;

    // Create generated_videos record
    const { data: generatedVideo, error: insertError } = await supabaseAdmin
      .from("generated_videos")
      .insert({
        user_id: user.id,
        source_video_id: videoId || null,
        product_image_url: imageUrl,
        duration_seconds: durationSeconds,
        status: "processing",
        kie_task_id: taskId,
        prompt_used: prompt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create video record");
    }

    // Deduct credits
    if (userCredits) {
      await supabaseAdmin
        .from("video_credits")
        .update({
          credits_used: (userCredits.credits_used || 0) + creditsRequired,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    console.log(`Lip-sync video generation started: ${generatedVideo.id}, task: ${taskId}`);

    return new Response(
      JSON.stringify({
        success: true,
        generatedVideoId: generatedVideo.id,
        taskId: taskId,
        estimatedTime: "2-3 minutos",
        message: "Video con lip-sync en proceso. Se combina automáticamente con el audio.",
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
