import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Master prompt for hyperrealistic UGC creator images
const UGC_IMAGE_SYSTEM_PROMPT = `You are an expert at generating hyperrealistic photos of TikTok content creators for product videos.

CREATE images that look like REAL iPhone selfie photos, NOT professional photography.

VISUAL REQUIREMENTS:
- Vertical 9:16 aspect ratio (TikTok format)
- Creator looking directly at camera
- Natural, friendly, approachable expression
- Casual home setting: bedroom, living room, or kitchen
- Natural window lighting, soft and flattering
- No professional makeup or styling
- Casual modern clothing
- The product should be held naturally in their hands
- "Selfie" angle and composition
- Authentic, relatable appearance

AVOID:
- Studio backgrounds
- Professional lighting setups
- Perfect poses
- Heavy makeup
- Commercial/advertising look
- Text or logos
- Overly polished appearance

The goal is that the image looks like it was taken by a real person with their phone, not by a professional photographer.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, productImageUrl, creatorGender = "any", creatorAge = "25-35" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating UGC image for product: ${productName}, gender: ${creatorGender}, age: ${creatorAge}`);

    // Build the image generation prompt
    const genderText = creatorGender === "any" 
      ? "young Latin American person" 
      : creatorGender === "male" 
        ? "young Latin American man" 
        : "young Latin American woman";

    const imagePrompt = `Hyperrealistic photograph of a ${genderText}, ${creatorAge} years old, TikTok content creator.

SCENE:
- Person is holding "${productName}" naturally in their hands, showing it to the camera
- Looking directly at camera with a friendly, genuine smile
- Casual home setting: cozy bedroom or living room in the background
- Natural daylight from a window, creating soft, flattering lighting
- Vertical 9:16 aspect ratio, like a smartphone selfie

APPEARANCE:
- Casual modern clothing (t-shirt, hoodie, or simple top)
- No professional makeup, natural look
- Relaxed, approachable body language
- Authentic facial expression, like mid-conversation

QUALITY:
- Ultra high resolution
- Photorealistic, like a real iPhone photo
- Natural skin texture and imperfections
- Realistic fabric textures
- Soft ambient shadows

STYLE:
- Raw, authentic, unfiltered look
- Like a real selfie from someone's camera roll
- NOT an advertisement, NOT studio photography
- Warm, inviting atmosphere

${productImageUrl ? `Reference: The product being held looks like the item in this image: ${productImageUrl}` : ''}`;

    console.log("Calling Gemini 2.5 Flash Image...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "system", content: UGC_IMAGE_SYSTEM_PROMPT },
          { role: "user", content: imagePrompt }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response received");

    // Extract the generated image
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data, null, 2));
      throw new Error("No image generated");
    }

    console.log("UGC image generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageData, // This is a base64 data URL
        message: data.choices?.[0]?.message?.content || "Image generated",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating UGC image:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
