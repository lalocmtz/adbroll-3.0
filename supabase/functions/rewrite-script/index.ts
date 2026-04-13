import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres un experto copywriter especializado en videos de TikTok Shop que generan ventas.

Tu tarea es reescribir guiones de videos exitosos de TikTok Shop con estas características:

1. TONO COMERCIAL Y DIRECTO: Escribe como si estuvieras vendiendo directamente al espectador
2. ENFOQUE EMOCIONAL: Usa palabras que generen deseo, urgencia y necesidad
3. ESTRUCTURA CLARA:
   - Hook inicial impactante (primeros 3 segundos)
   - Demostración de valor y beneficios
   - Superación de objeciones
   - Llamado a la acción claro y urgente
4. LENGUAJE ADAPTABLE: Usa español neutro pero conversacional, fácil de adaptar a cualquier producto
5. VENTA DIRECTA: No seas sutil, el objetivo es vender

Reescribe el guión manteniendo la esencia del video original pero optimizándolo para que otro creador pueda:
- Adaptarlo fácilmente a su producto
- Usarlo como voice-over o script para cámara
- Generar más ventas con la misma estructura probada

Formatea el guión en secciones claras (Hook, Desarrollo, Cierre) y usa un lenguaje convincente pero natural.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Rewriting script for transcription...');

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
          { role: 'user', content: `Reescribe este guión de TikTok Shop para que sea más vendedor y adaptable:\n\n${transcription}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rewrittenScript = data.choices[0].message.content;

    console.log('Script rewritten successfully');

    return new Response(
      JSON.stringify({ rewritten_script: rewrittenScript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in rewrite-script:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
