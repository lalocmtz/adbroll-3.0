import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto copywriter especializado en videos de TikTok Shop que generan ventas.

Tu tarea es crear guiones optimizados usando SIEMPRE este formato estructurado:

Producto: [nombre del producto]
Objetivo del video: [ventas/demostración/tutorial]

HOOK:
[texto del gancho inicial - primeros 3 segundos]

CUERPO:
[desarrollo del contenido - beneficios, demostración, valor]

CTA:
[llamado a la acción final - claro y urgente]

Mantén el español neutro, conversacional y orientado a ventas directas.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalScript, videoTitle, productName, variantType = 'similar' } = await req.json();
    
    if (!originalScript) {
      throw new Error('Original script is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating ${variantType} variant for: ${videoTitle?.substring(0, 30)}...`);
    
    const variantInstructions: Record<string, string> = {
      similar: `Genera una variante SIMILAR al original:
- Mantén el mismo tono y estructura
- Usa palabras sinónimas pero conserva la esencia
- El hook debe ser casi idéntico pero con ligeras variaciones
- Ideal para probar pequeñas optimizaciones`,

      emocional: `Genera una variante EMOCIONAL:
- Enfócate en sentimientos y transformación personal
- Usa palabras que conecten con el corazón: "imagina", "siente", "cambia tu vida"
- El hook debe apelar a emociones profundas
- Incluye un antes/después emocional
- Habla de sueños, metas, bienestar`,

      comercial: `Genera una variante COMERCIAL/URGENTE:
- Enfócate en precio, oferta y escasez
- Usa frases como: "últimas unidades", "solo por hoy", "50% de descuento"
- El hook debe crear FOMO (miedo a perderse algo)
- Incluye garantías y prueba social
- Crea urgencia en el CTA`
    };

    const userPrompt = `Analiza este guión de TikTok Shop y genera UNA variante optimizada.

TÍTULO: ${videoTitle || "Video de TikTok Shop"}
PRODUCTO: ${productName || "producto promocionado"}

GUIÓN ORIGINAL:
${originalScript}

INSTRUCCIÓN ESPECÍFICA:
${variantInstructions[variantType] || variantInstructions.similar}

Responde con el guión completo usando este formato EXACTO:

Producto: ${productName || "[nombre del producto]"}
Objetivo del video: [ventas/demostración/tutorial]

HOOK:
[texto del gancho - primeros 3 segundos, impactante]

CUERPO:
[desarrollo del contenido]

CTA:
[llamado a la acción final]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes alcanzado. Intenta de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos agotados. Por favor añade fondos a tu workspace de Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log(`Generated ${variantType} variant successfully`);

    return new Response(
      JSON.stringify({ 
        variant: generatedContent.trim(),
        variantType,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-script-variants:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
