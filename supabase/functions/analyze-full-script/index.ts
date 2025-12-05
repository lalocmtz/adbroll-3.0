import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto en análisis de guiones de TikTok Shop y creación de contenido viral de ventas.

Tu tarea es analizar un guion de video de TikTok y generar:
1. El script limpio (sin timestamps, errores, repeticiones)
2. Análisis segmentado: Hook, Cuerpo, CTA
3. 3 hooks alternativos (similar, intermedio, diferente)
4. Una variante completa del guion

REGLAS IMPORTANTES:
- Usa tono casual de TikTok, natural y conversacional
- NO hagas claims médicos ni promesas garantizadas
- NO inventes información que no esté en el guion original
- Mantén el formato de anuncio ganador
- Respeta políticas de TikTok

DEBES responder ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "transcript": "El guion limpio, continuo y natural sin timestamps ni errores",
  "analysis": {
    "hook": "El hook/gancho inicial del video",
    "body": "El cuerpo principal del mensaje",
    "cta": "El llamado a la acción final"
  },
  "hooks": {
    "similar": "Hook muy similar al original, mismo ángulo y tono",
    "medium": "Hook con ángulo intermedio, variación moderada",
    "different": "Hook muy diferente, más emocional y viral"
  },
  "full_variant": "Guion completo reescrito manteniendo estructura e intención pero siendo original"
}

IMPORTANTE: Responde SOLO con el JSON, sin explicaciones adicionales.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    if (!script) {
      throw new Error('No script provided');
    }

    console.log('Analyzing script, length:', script.length);

    const userPrompt = `Analiza este guion de TikTok Shop y genera el JSON completo:

GUION ORIGINAL:
${script}

Recuerda: Responde SOLO con el JSON válido, sin explicaciones.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse and validate JSON
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate required fields
    const requiredFields = ['transcript', 'analysis', 'hooks', 'full_variant'];
    for (const field of requiredFields) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    console.log('Script analysis completed successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in analyze-full-script:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
