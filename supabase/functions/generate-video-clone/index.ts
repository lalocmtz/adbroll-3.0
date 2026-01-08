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

// Master prompt for UGC organic videos
const UGC_VIDEO_PROMPT_TEMPLATE = `Vertical 9:16 video of a content creator talking directly to camera.

SCENE:
- Creator in casual home setting (bedroom or living room)
- Natural window lighting throughout the video
- Static background, no scene changes
- Warm, inviting atmosphere

MOVEMENT & EXPRESSION:
- Subtle natural head movements
- Hand gestures while explaining
- Natural facial expressions changing throughout
- Lips moving as if speaking enthusiastically
- Occasional blinks and micro-expressions
- Small body shifts for authenticity
- Eye contact with camera maintained

STYLE:
- Raw, authentic TikTok UGC style
- NOT cinematic, NOT professional
- Like a real selfie video recorded on phone
- Very subtle handheld camera micro-shake
- No transitions, no effects, no music overlay
- No dramatic lighting changes
- Feels like watching a real person's video

AVOID:
- Studio or professional settings
- Dramatic camera movements or zooms
- Scene cuts or transitions
- Text overlays or graphics
- Special effects or filters
- Multiple camera angles
- Artificial or commercial feel

DURATION: {{DURATION}} seconds`;

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
      videoId, 
      productImageUrl, 
      duration = "15", 
      customPrompt,
      scriptType = "variant", // 'original' | 'variant'
      scriptContent,
      ugcImageUrl, // Pre-generated UGC creator image
    } = await req.json();

    console.log(`Generate UGC video for user ${user.id}, video ${videoId}, duration ${duration}s, scriptType: ${scriptType}`);

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

    // Get source video info
    let sourceVideo = null;
    let productName = "";
    if (videoId) {
      const { data: video } = await supabaseAdmin
        .from("videos")
        .select("*, product:products(*)")
        .eq("id", videoId)
        .single();
      sourceVideo = video;
      productName = video?.product?.producto_nombre || video?.product_name || "producto";
    }

    // Determine which image to use for video generation
    // Priority: ugcImageUrl (pre-generated creator) > productImageUrl
    const imageForVideo = ugcImageUrl || productImageUrl;
    
    if (!imageForVideo) {
      throw new Error("No image provided for video generation");
    }

    // Generate UGC-optimized prompt
    let prompt = customPrompt;
    if (!prompt) {
      prompt = await generateUGCVideoPrompt(
        sourceVideo, 
        productName, 
        scriptType, 
        scriptContent, 
        duration
      );
    }

    console.log(`Generated UGC prompt: ${prompt.substring(0, 200)}...`);

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
        imageUrl: imageForVideo,
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
        product_image_url: imageForVideo,
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

    console.log(`UGC video generation started. Task ID: ${kieTaskId}, Credits used: ${creditsRequired}`);

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

// Generate an optimized UGC-style prompt for organic TikTok videos
async function generateUGCVideoPrompt(
  video: any, 
  productName: string,
  scriptType: string,
  scriptContent: string | undefined,
  duration: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  // Use the master template as base
  let basePrompt = UGC_VIDEO_PROMPT_TEMPLATE.replace("{{DURATION}}", duration);
  
  if (!LOVABLE_API_KEY) {
    console.log("LOVABLE_API_KEY not set, using template prompt");
    return basePrompt;
  }

  try {
    // Get the script to base the video on
    const script = scriptContent || video?.transcript || "";
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at creating video generation prompts for Sora 2 and Runway that produce ORGANIC, AUTHENTIC TikTok UGC (User Generated Content) videos.

Your prompts must create videos that look like a REAL PERSON recorded with their phone, NOT professional production.

CRITICAL RULES:
1. Always request VERTICAL 9:16 format
2. Always describe a creator TALKING to camera (lips moving)
3. Always include NATURAL movements (head tilts, hand gestures)
4. NEVER include professional lighting, studio settings, or cinematic elements
5. Keep the prompt focused on ORGANIC, RAW, AUTHENTIC feel
6. Describe the ENERGY and EMOTION of someone genuinely excited about a product
7. Output only the prompt, no explanations, maximum 100 words in English`
          },
          {
            role: "user",
            content: `Create a Sora 2 video prompt for an organic TikTok UGC video about "${productName}".

The creator should appear to be saying this script naturally:
"${script.substring(0, 400)}"

The video should feel like a real TikTok creator genuinely recommending this product from their home.

Requirements:
- Vertical 9:16 (TikTok format)
- ${duration} seconds duration
- Creator talking directly to camera
- Natural home setting
- Raw, authentic UGC style
- Hand gestures and expressions matching the script energy

Output only the prompt.`
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("Error from Lovable AI:", response.status);
      return basePrompt;
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content;
    
    if (generatedPrompt) {
      // Append critical requirements to ensure format
      return `${generatedPrompt}\n\nCRITICAL: Vertical 9:16 format. ${duration} seconds. Lips moving as if speaking. Natural head movements and hand gestures. Raw authentic UGC style, NOT professional.`;
    }
    
    return basePrompt;
  } catch (error) {
    console.error("Error generating UGC prompt:", error);
    return basePrompt;
  }
}
