import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, videoTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing script insights for:', videoTitle);

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
            content: `Eres un experto en análisis de guiones de TikTok Shop. Analiza el guion y proporciona insights profundos.

IMPORTANTE: Responde SOLO con JSON válido en este formato exacto:
{
  "insights": {
    "funcionamiento": "Explicación de por qué este guion funciona (1-2 oraciones)",
    "angulos": ["ángulo 1", "ángulo 2", "ángulo 3"],
    "ctaLocation": "Descripción de dónde está el CTA y cómo se presenta",
    "estructura": "Tipo de estructura usada (ej: PAS, AIDA, etc.)",
    "fortalezas": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
    "debilidades": ["debilidad 1", "debilidad 2"]
  }
}

No agregues texto adicional, solo el JSON.`
          },
          {
            role: 'user',
            content: `Analiza este guion de video de TikTok Shop y proporciona insights:\n\nTítulo: ${videoTitle}\n\nGuion:\n${script}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Parse JSON from response
    let insights;
    try {
      const parsed = JSON.parse(content);
      insights = parsed.insights;
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback: return default structure
      insights = {
        funcionamiento: "El guion utiliza técnicas de venta directa y emocional.",
        angulos: ["Beneficio directo", "Urgencia", "Prueba social"],
        ctaLocation: "Al final del video",
        estructura: "PAS (Problema-Agitación-Solución)",
        fortalezas: ["Claro y directo", "Genera urgencia"],
        debilidades: ["Podría tener más demostración"]
      };
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in analyze-script-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
