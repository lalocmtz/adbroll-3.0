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

// Cost mapping for duration (Pro Standard prices)
const DURATION_COSTS: Record<string, number> = {
  "10": 0.75,
  "15": 1.35,
  "25": 2.25,
};

// Credits required per duration
const DURATION_CREDITS: Record<string, number> = {
  "10": 1,
  "15": 1,
  "25": 2,
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

    const { videoId, productImageUrl, duration = "15", customPrompt } = await req.json();
    console.log(`Generate video clone for user ${user.id}, video ${videoId}, duration ${duration}s`);

    // Validate duration
    if (!["10", "15", "25"].includes(duration)) {
      throw new Error("Invalid duration. Must be 10, 15, or 25");
    }

    const creditsRequired = DURATION_CREDITS[duration];

    // Check user credits
    const { data: credits, error: creditsError } = await supabaseAdmin
      .from("video_credits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creditsError && creditsError.code !== "PGRST116") {
      throw new Error(`Error checking credits: ${creditsError.message}`);
    }

    const availableCredits = credits ? (credits.credits_total - credits.credits_used) : 0;
    
    if (availableCredits < creditsRequired) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits", 
          available: availableCredits, 
          required: creditsRequired 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get source video info for prompt generation
    let sourceVideo = null;
    if (videoId) {
      const { data: video } = await supabaseAdmin
        .from("videos")
        .select("*, product:products(*)")
        .eq("id", videoId)
        .single();
      sourceVideo = video;
    }

    // Generate optimized prompt for Sora 2
    let prompt = customPrompt;
    if (!prompt && sourceVideo) {
      prompt = await generateSora2Prompt(sourceVideo);
    }
    if (!prompt) {
      prompt = "A TikTok-style product showcase video with dynamic camera movements, good lighting, and engaging presentation. Modern aesthetic, 9:16 vertical format.";
    }

    console.log(`Generated prompt: ${prompt.substring(0, 100)}...`);

    // Call Kie.ai API (Runway endpoint)
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_API_KEY not configured");
    }

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/video-generation-callback`;

    // Map duration to Kie.ai format
    const kieDuration = duration === "10" ? "5" : duration === "25" ? "10" : "5";
    const kieModel = kieDuration === "10" ? "runway-duration-10-generate" : "runway-duration-5-generate";

    const kieResponse = await fetch("https://api.kie.ai/api/v1/runway/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        imageUrl: productImageUrl,
        model: kieModel,
        aspectRatio: "vertical", // TikTok 9:16 format
        duration: parseInt(kieDuration),
        quality: "720p",
        waterMark: "",
        callBackUrl: callbackUrl,
      }),
    });

    const kieData = await kieResponse.json();
    console.log("Kie.ai response:", kieData);

    if (kieData.code !== 200 || !kieData.data?.taskId) {
      throw new Error(`Kie.ai error: ${kieData.msg || JSON.stringify(kieData)}`);
    }

    const kieTaskId = kieData.data.taskId;

    // Create generated_videos record
    const costUsd = DURATION_COSTS[duration];
    const { data: generatedVideo, error: insertError } = await supabaseAdmin
      .from("generated_videos")
      .insert({
        user_id: user.id,
        source_video_id: videoId || null,
        prompt_used: prompt,
        product_image_url: productImageUrl,
        kie_task_id: kieTaskId,
        duration_seconds: parseInt(duration),
        status: "processing",
        cost_usd: costUsd,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error creating record: ${insertError.message}`);
    }

    // Deduct credits
    await supabaseAdmin
      .from("video_credits")
      .update({ 
        credits_used: credits!.credits_used + creditsRequired,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    console.log(`Video generation started. Task ID: ${kieTaskId}, Credits used: ${creditsRequired}`);

    return new Response(
      JSON.stringify({
        success: true,
        generatedVideoId: generatedVideo.id,
        kieTaskId,
        creditsUsed: creditsRequired,
        estimatedTime: duration === "25" ? "2-3 minutes" : "1-2 minutes",
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

// Generate an optimized prompt for Sora 2 based on source video
async function generateSora2Prompt(video: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not set, using default prompt");
    return "";
  }

  try {
    const transcript = video.transcript || "";
    const productName = video.product?.producto_nombre || video.product_name || "product";
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating video generation prompts for Sora 2. Create cinematic, dynamic prompts that describe TikTok-style product videos. Focus on camera movements, lighting, mood, and visual style. Keep prompts between 50-80 words in English."
          },
          {
            role: "user",
            content: `Create a Sora 2 video prompt for a TikTok Shop video about "${productName}". 
            
The original script was: "${transcript.substring(0, 500)}"

Generate a prompt that describes:
- Camera movements (slow pan, zoom in, tracking shot)
- Lighting style (natural, studio, golden hour)
- Visual mood (energetic, calm, luxurious)
- Product showcase angles
- Modern TikTok aesthetic
- 9:16 vertical format

Output only the prompt, no explanations.`
          }
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Error generating prompt:", error);
    return "";
  }
}