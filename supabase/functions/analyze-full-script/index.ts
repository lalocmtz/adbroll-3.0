import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto en análisis de guiones de TikTok Shop y creación de contenido viral de ventas.

Tu tarea es analizar un guion de video de TikTok y generar:
1. Un análisis completo del guion
2. 3 hooks diferentes (similar, variado, disruptivo)
3. Un cuerpo reescrito para cada hook

REGLAS IMPORTANTES:
- Usa tono casual de TikTok, natural y conversacional
- NO hagas claims médicos ni promesas garantizadas
- NO inventes información que no esté en el guion original
- Mantén el formato de anuncio ganador
- Respeta políticas de TikTok

DEBES responder ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "script_original_limpio": "El guion limpio sin timestamps ni errores",
  "analisis_guion": {
    "hook_detectado": "El hook que aparece en el video",
    "problema": "El problema que resuelve el producto",
    "beneficios": "Los beneficios mencionados",
    "demostracion": "Cómo se demuestra el producto",
    "cta": "El llamado a la acción",
    "intencion_emocional": "Qué emoción busca generar",
    "fortalezas": ["Lista de fortalezas del guion"],
    "debilidades": ["Lista de debilidades"],
    "oportunidades_mejora": ["Lista de oportunidades"]
  },
  "hooks": {
    "hook_1_similar": "Hook muy similar al original, mismo ángulo y tono",
    "hook_2_variado": "Hook con ángulo diferente pero coherente",
    "hook_3_disruptivo": "Hook emocional, viral, sorprendente"
  },
  "cuerpo_reescrito": {
    "para_hook_1": "Cuerpo completo adaptado al hook 1",
    "para_hook_2": "Cuerpo completo adaptado al hook 2",
    "para_hook_3": "Cuerpo completo adaptado al hook 3"
  }
}

IMPORTANTE: Responde SOLO con el JSON, sin explicaciones adicionales.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription, videoTitle, productName } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    if (!transcription) {
      throw new Error('No transcription provided');
    }

    console.log('Analyzing script for video:', videoTitle);

    const userPrompt = `Analiza este guion de TikTok Shop y genera el JSON completo:

TÍTULO DEL VIDEO: ${videoTitle || 'Sin título'}
PRODUCTO: ${productName || 'No especificado'}

GUION ORIGINAL:
${transcription}

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
    const requiredFields = ['script_original_limpio', 'analisis_guion', 'hooks', 'cuerpo_reescrito'];
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
