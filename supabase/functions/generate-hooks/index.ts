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
    const { productDescription } = await req.json();

    if (!productDescription) {
      return new Response(
        JSON.stringify({ error: 'Product description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating hooks for:', productDescription.substring(0, 100));

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
            content: `Eres un experto en copywriting para TikTok Shop México. Tu trabajo es crear hooks que detengan el scroll y generen ventas.

Características de un buen hook para TikTok Shop:
- Genera CURIOSIDAD inmediata
- Usa palabras de poder: "secreto", "nadie te dice", "error", "gratis", "viral"
- Apela a emociones: miedo a perderse algo, deseo de mejorar, urgencia
- Máximo 15 palabras por hook
- En español mexicano natural, no formal
- Evita clichés genéricos

Formatos que funcionan:
- Pregunta que genera intriga
- Declaración controversial
- "POV:" o "Esto es para ti si..."
- Advertencia o secreto revelado
- Transformación antes/después`
          },
          {
            role: 'user',
            content: `Genera exactamente 10 hooks diferentes y creativos para este producto/beneficio:

${productDescription}

Responde SOLO con un array JSON de 10 strings, sin explicaciones. Ejemplo:
["Hook 1 aquí", "Hook 2 aquí", ...]`
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

    console.log('AI response:', content);

    // Parse the JSON array from the response
    let hooks: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        hooks = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback: split by newlines and clean up
      hooks = content
        .split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('[') && !line.startsWith(']'))
        .map((line: string) => line.replace(/^[\d\.\-\*"]+\s*/, '').replace(/[",]$/g, '').trim())
        .filter((hook: string) => hook.length > 5)
        .slice(0, 10);
    }

    // Ensure we have at least some hooks
    if (hooks.length === 0) {
      hooks = ['No se pudieron generar hooks. Intenta con otra descripción.'];
    }

    return new Response(
      JSON.stringify({ hooks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-hooks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
