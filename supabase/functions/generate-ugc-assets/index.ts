import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AVATAR_DESCRIPTIONS: Record<string, { es: string; appearance: string }> = {
  latina_joven: {
    es: "Mujer Latina Joven",
    appearance: "young Latina woman in her mid-20s, warm brown skin, dark wavy hair, friendly smile, natural makeup"
  },
  profesional: {
    es: "Mujer Profesional",
    appearance: "professional woman in her early 30s, elegant appearance, subtle makeup, confident expression, well-groomed"
  },
  hombre_casual: {
    es: "Hombre Casual",
    appearance: "casual young man in his late 20s, friendly demeanor, clean-shaven, natural relaxed look"
  },
  influencer: {
    es: "Influencer Trendy",
    appearance: "trendy young influencer woman, stylish appearance, perfect lighting, Instagram aesthetic"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, avatarType, productImageUrl } = await req.json();

    if (!productDescription || !avatarType) {
      return new Response(
        JSON.stringify({ error: 'Product description and avatar type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const avatar = AVATAR_DESCRIPTIONS[avatarType] || AVATAR_DESCRIPTIONS.latina_joven;

    console.log('Generating UGC assets for:', { productDescription, avatarType });

    // Generate script and image prompts using AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en crear guiones y prompts para videos UGC (User Generated Content) de TikTok Shop que venden productos de manera efectiva.

Tu trabajo es:
1. Crear un guión de venta corto (2 frases, ~12 segundos al leerlo)
2. Crear 2 prompts de imagen detallados para generar imágenes consistentes de la misma persona

El guión debe ser:
- En español mexicano casual
- Frase 1: Un gancho que capture atención
- Frase 2: El beneficio principal del producto + call to action

Los prompts de imagen deben:
- Usar el mismo personaje descrito
- Escena 1: Plano medio (de cintura para arriba), mirando a cámara
- Escena 2: Plano de cuerpo entero, mostrando el producto en movimiento

IMPORTANTE: Los prompts deben ser en inglés para mejor generación de imagen.`
          },
          {
            role: 'user',
            content: `Crea contenido UGC para este producto:

PRODUCTO: ${productDescription}
MODELO/AVATAR: ${avatar.appearance}

Responde en JSON exactamente así:
{
  "script": "Las 2 frases del guión aquí, separadas por un punto",
  "prompt_scene_1": "Detailed image prompt for medium shot of the model talking to camera, wearing/using the product, UGC style, shot on iPhone, natural lighting, home background",
  "prompt_scene_2": "Detailed image prompt for full body shot of the same model walking, showing the product in motion, lifestyle background, candid UGC aesthetic"
}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('AI response received');

    // Parse the JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback structure
      result = {
        script: "¡Este producto te va a cambiar la vida! Dale al carrito amarillo antes de que se agote.",
        prompt_scene_1: `Medium shot of ${avatar.appearance}, looking at camera with a warm smile, holding a product, UGC style iPhone footage, natural window lighting, cozy home background, authentic content creator aesthetic`,
        prompt_scene_2: `Full body shot of ${avatar.appearance}, walking confidently, product visible, urban lifestyle background, golden hour lighting, candid UGC aesthetic, shot on iPhone`
      };
    }

    // Enhance prompts with avatar description
    result.prompt_scene_1 = result.prompt_scene_1.replace(/\b(person|model|woman|man)\b/gi, avatar.appearance);
    result.prompt_scene_2 = result.prompt_scene_2.replace(/\b(person|model|woman|man)\b/gi, avatar.appearance);

    return new Response(
      JSON.stringify({
        script: result.script,
        prompt_scene_1: result.prompt_scene_1,
        prompt_scene_2: result.prompt_scene_2,
        avatar_description: avatar.appearance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-ugc-assets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
