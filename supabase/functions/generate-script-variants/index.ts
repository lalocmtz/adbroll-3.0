import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VariantRequest {
  transcript: string;
  analysis?: {
    hook?: string;
    body?: string;
    cta?: string;
  };
  product?: {
    producto_nombre?: string;
  };
  variantCount: number;
  changeLevel: 'light' | 'medium' | 'aggressive';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { transcript, analysis, product, variantCount, changeLevel } = await req.json() as VariantRequest;

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    console.log('Generating variants:', { variantCount, changeLevel, hasAnalysis: !!analysis });

    // Map change level to Spanish
    const changeLevelMap: Record<string, string> = {
      light: 'ligero',
      medium: 'medio',
      aggressive: 'agresivo'
    };

    const levelInstructions: Record<string, string> = {
      light: 'Mantén la estructura original, solo mejora palabras clave y el flujo. Cambios sutiles.',
      medium: 'Cambia el enfoque y ángulo pero mantén el mensaje principal. Reestructura secciones.',
      aggressive: 'Reimagina completamente el guión con un ángulo diferente. Nuevo enfoque creativo.'
    };

    const prompt = `Eres un copywriter experto en TikTok Shop. Genera VARIANTES DE GUIÓN basadas en el contenido original.

TRANSCRIPT_ORIGINAL:
"""
${transcript}
"""

RESUMEN_GUIÓN_ACTUAL:
- Hook: ${analysis?.hook || 'No analizado aún'}
- Cuerpo: ${analysis?.body || 'No analizado aún'}
- CTA: ${analysis?.cta || 'No analizado aún'}

DATOS_DEL_PRODUCTO:
- Nombre: ${product?.producto_nombre || 'Producto TikTok Shop'}

PREFERENCIAS DEL USUARIO:
- cantidad_variantes: ${variantCount}
- nivel_cambio: "${changeLevelMap[changeLevel]}"

INSTRUCCIONES POR NIVEL:
${levelInstructions[changeLevel]}

REGLAS ESTRICTAS:
- No inventes precios ni datos falsos.
- Hook máximo 25 palabras - debe captar atención en 3 segundos.
- Cuerpo máximo 150 palabras - desarrollo persuasivo.
- CTA máximo 25 palabras - acción clara y urgente.
- Cada variante debe ser DISTINTA entre sí.
- Mantén estilo conversacional de TikTok.
- Produce EXACTAMENTE ${variantCount} variante(s).
- Español neutro latinoamericano.

Responde ÚNICAMENTE con JSON válido, SIN markdown ni explicaciones adicionales:
{
  "variants": [
    {
      "id": 1,
      "hook": "texto del hook aquí",
      "cuerpo": "texto del cuerpo aquí",
      "cta": "texto del CTA aquí",
      "nota_estrategia": "breve nota de por qué funciona esta variante"
    }
  ]
}`;

    console.log('Calling Lovable AI Gateway...');

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
            content: 'Eres un experto copywriter de TikTok Shop. SIEMPRE respondes en JSON válido sin markdown ni texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Límite de solicitudes alcanzado. Intenta de nuevo en unos segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos agotados. Por favor añade fondos a tu workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', jsonContent.substring(0, 200));
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Parsed variants count:', parsed.variants?.length || 0);

    // Transform to match frontend expected format
    const variants = parsed.variants?.map((v: any) => ({
      hook: v.hook || '',
      body: v.cuerpo || '',
      cta: v.cta || '',
      strategy_note: v.nota_estrategia || ''
    })) || [];

    return new Response(JSON.stringify({ 
      variants,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating variants:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Error desconocido generando variantes' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
