import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto copywriter especializado en videos de TikTok Shop que generan ventas.

Tu tarea es crear variantes optimizadas de guiones de videos exitosos de TikTok Shop.

CARACTERÍSTICAS DE CADA VARIANTE:
1. TONO COMERCIAL Y DIRECTO: Escribe como si estuvieras vendiendo directamente al espectador
2. ENFOQUE EMOCIONAL: Usa palabras que generen deseo, urgencia y necesidad
3. ESTRUCTURA CLARA:
   - Hook inicial impactante (primeros 3 segundos)
   - Demostración de valor y beneficios
   - Superación de objeciones
   - Llamado a la acción claro y urgente
4. LENGUAJE ADAPTABLE: Usa español neutro pero conversacional
5. VENTA DIRECTA: No seas sutil, el objetivo es vender

DIFERENCIACIÓN ENTRE VARIANTES:
- Variante 1: Enfoque en URGENCIA y ESCASEZ
- Variante 2: Enfoque en BENEFICIOS y TRANSFORMACIÓN
- Variante 3: Enfoque en TESTIMONIOS y PRUEBA SOCIAL

Cada variante debe:
- Mantener la estructura probada del video original
- Ser fácilmente adaptable a cualquier producto
- Usar voice-over o script para cámara
- Estar formateada en secciones: [HOOK], [DESARROLLO], [CIERRE]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalScript, videoTitle, numVariants = 1 } = await req.json();
    
    if (!originalScript) {
      throw new Error('Original script is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating ${numVariants} script variant(s)...`);

    const userPrompt = numVariants === 1 
      ? `Genera 1 variante optimizada del siguiente guión de TikTok Shop:\n\nTÍTULO: ${videoTitle}\n\nGUIÓN ORIGINAL:\n${originalScript}\n\nGenera UNA variante enfocada en URGENCIA y ESCASEZ.`
      : `Genera 3 variantes diferentes del siguiente guión de TikTok Shop:\n\nTÍTULO: ${videoTitle}\n\nGUIÓN ORIGINAL:\n${originalScript}\n\nGenera 3 variantes claramente diferenciadas:\n1. URGENCIA y ESCASEZ\n2. BENEFICIOS y TRANSFORMACIÓN\n3. TESTIMONIOS y PRUEBA SOCIAL\n\nSepara cada variante con "===VARIANTE [número]==="`;

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

    // Parse variants
    let variants: string[] = [];
    if (numVariants === 1) {
      variants = [generatedContent];
    } else {
      // Split by variant separator
      const splitVariants = generatedContent.split(/===VARIANTE \d+===/i).filter((v: string) => v.trim());
      variants = splitVariants.length >= 3 ? splitVariants.slice(0, 3) : [generatedContent];
    }

    console.log(`Generated ${variants.length} variant(s) successfully`);

    return new Response(
      JSON.stringify({ 
        variants: variants.map((v: string) => v.trim()),
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
