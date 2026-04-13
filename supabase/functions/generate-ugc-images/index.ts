import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt_scene_1, prompt_scene_2, generationId } = await req.json();

    if (!prompt_scene_1 || !prompt_scene_2) {
      return new Response(
        JSON.stringify({ error: 'Both scene prompts are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log('Generating UGC images for generation:', generationId);

    // Generate Image 1 using Nano Banana (Gemini Image)
    const image1Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a high-quality UGC-style image: ${prompt_scene_1}. Make it look like authentic user-generated content filmed on an iPhone, natural lighting, realistic proportions, no text overlays.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!image1Response.ok) {
      throw new Error(`Image 1 generation failed: ${image1Response.status}`);
    }

    const image1Data = await image1Response.json();
    const image1Base64 = image1Data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!image1Base64) {
      throw new Error('No image generated for scene 1');
    }

    console.log('Image 1 generated successfully');

    // Generate Image 2 with reference to maintain consistency
    const image2Response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Generate a matching image showing the SAME person from a different angle: ${prompt_scene_2}. Maintain the same person's appearance, clothing style, and product. Make it look like authentic UGC content, filmed on iPhone, natural outdoor lighting.`
              },
              {
                type: 'image_url',
                image_url: { url: image1Base64 }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!image2Response.ok) {
      throw new Error(`Image 2 generation failed: ${image2Response.status}`);
    }

    const image2Data = await image2Response.json();
    const image2Base64 = image2Data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!image2Base64) {
      throw new Error('No image generated for scene 2');
    }

    console.log('Image 2 generated successfully');

    // Upload images to Supabase Storage
    const timestamp = Date.now();
    
    // Extract base64 data and upload
    const image1Buffer = Uint8Array.from(atob(image1Base64.split(',')[1]), c => c.charCodeAt(0));
    const image2Buffer = Uint8Array.from(atob(image2Base64.split(',')[1]), c => c.charCodeAt(0));

    const { data: upload1, error: uploadError1 } = await supabase.storage
      .from('generated-content')
      .upload(`ugc/${generationId}/scene1_${timestamp}.png`, image1Buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError1) {
      console.error('Upload error 1:', uploadError1);
      throw new Error(`Failed to upload image 1: ${uploadError1.message}`);
    }

    const { data: upload2, error: uploadError2 } = await supabase.storage
      .from('generated-content')
      .upload(`ugc/${generationId}/scene2_${timestamp}.png`, image2Buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError2) {
      console.error('Upload error 2:', uploadError2);
      throw new Error(`Failed to upload image 2: ${uploadError2.message}`);
    }

    // Get public URLs
    const { data: url1 } = supabase.storage
      .from('generated-content')
      .getPublicUrl(`ugc/${generationId}/scene1_${timestamp}.png`);

    const { data: url2 } = supabase.storage
      .from('generated-content')
      .getPublicUrl(`ugc/${generationId}/scene2_${timestamp}.png`);

    console.log('Images uploaded successfully:', url1.publicUrl, url2.publicUrl);

    return new Response(
      JSON.stringify({
        image_1_url: url1.publicUrl,
        image_2_url: url2.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-ugc-images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
