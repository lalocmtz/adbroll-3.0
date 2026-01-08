import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Spanish-speaking voices optimized for UGC content
const SPANISH_VOICES = {
  // Natural, conversational Spanish voices
  matilda: "XrExE9yKIg1WjnnlVkGX", // Warm, friendly female
  sarah: "EXAVITQu4vr4xnSDxMaL",   // Professional female
  charlie: "IKne3meq5aSn9XLyUdCD", // Casual male
  george: "JBFqnCBsd6RMkjVDRZzb",  // Confident male
  jessica: "cgSgspJ2msm6clMCkdW9", // Energetic female
  brian: "nPczCjzI2devNBz1zQrb",   // Deep male
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      text, 
      voiceId, 
      voiceType = "matilda", // Default to Matilda for Spanish UGC
      stability = 0.4, // Lower for more expressive/natural
      similarityBoost = 0.75,
      style = 0.3, // Some style for personality
      speed = 1.0,
    } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Use provided voiceId or lookup from voiceType
    const selectedVoiceId = voiceId || SPANISH_VOICES[voiceType as keyof typeof SPANISH_VOICES] || SPANISH_VOICES.matilda;

    console.log(`Generating TTS for text (${text.length} chars) with voice ${selectedVoiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // Best for Spanish
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: true,
            speed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid ElevenLabs API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(audioBuffer);

    console.log(`TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({ 
        success: true,
        audioContent: base64Audio,
        format: "mp3",
        voiceId: selectedVoiceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
