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

    console.log('Analyzing script sections for:', videoTitle);

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
            content: `Eres un experto en análisis de guiones de TikTok Shop. Tu tarea es identificar las secciones del guion.

Debes identificar y extraer estas secciones:
1. Hook (Gancho inicial que captura atención)
2. Problema (Problema que enfrenta el cliente)
3. Beneficio (Beneficios del producto)
4. Demostración (Cómo se usa o funciona)
5. CTA (Call to action)

IMPORTANTE: Responde SOLO con JSON válido en este formato exacto:
{
  "sections": [
    {
      "type": "hook",
      "label": "Hook",
      "content": "texto del hook extraído"
    },
    {
      "type": "problema",
      "label": "Problema",
      "content": "texto del problema"
    }
  ]
}

No agregues texto adicional, solo el JSON.`
          },
          {
            role: 'user',
            content: `Analiza este guion de video de TikTok Shop y extrae sus secciones:\n\nTítulo: ${videoTitle}\n\nGuion:\n${script}`
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
    let sections;
    try {
      const parsed = JSON.parse(content);
      sections = parsed.sections || [];
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback: return script as single section
      sections = [{
        type: 'hook',
        label: 'Guion Completo',
        content: script
      }];
    }

    return new Response(
      JSON.stringify({ sections }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in analyze-script-sections:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
