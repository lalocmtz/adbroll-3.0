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
    const { product, additionalBenefits } = await req.json();

    if (!product?.name) {
      return new Response(
        JSON.stringify({ error: 'Product is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating script for product:', product.name);

    const productContext = `
Producto: ${product.name}
Categoría: ${product.category || 'General'}
Precio: ${product.price ? `$${product.price} MXN` : 'No especificado'}
Comisión: ${product.commission ? `${product.commission}%` : 'No especificada'}
${additionalBenefits ? `Beneficios adicionales: ${additionalBenefits}` : ''}
`.trim();

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
            content: `Eres un experto en copywriting para TikTok Shop México. Creas guiones que generan miles de ventas.

ESTRUCTURA PSICOLÓGICA DE UN GUIÓN EXITOSO:

1. 🎯 HOOK (0-3 segundos)
   - Detiene el scroll inmediatamente
   - Genera curiosidad o emoción fuerte
   - Máximo 1-2 oraciones

2. 😰 PROBLEMA (3-8 segundos)
   - Conecta con el dolor del cliente
   - Específico y relatable
   - Usa "tú" directamente

3. ✨ SOLUCIÓN (8-20 segundos)
   - Presenta el producto como LA solución
   - Beneficios concretos, no características
   - Prueba social si aplica

4. 📱 DEMOSTRACIÓN (opcional, 20-35 segundos)
   - Muestra el producto en acción
   - Resultados visuales

5. 🛒 CTA (últimos 3-5 segundos)
   - Urgencia: "Solo hoy", "Últimas unidades"
   - Instrucción clara: "Dale al carrito amarillo"
   - Beneficio final

ESTILO:
- Español mexicano coloquial pero profesional
- Oraciones cortas y punchy
- Evita palabras técnicas innecesarias
- Duración total: 30-45 segundos al leerlo en voz alta`
          },
          {
            role: 'user',
            content: `Crea un guión completo para TikTok Shop con este producto:

${productContext}

Responde en formato JSON exactamente así:
{
  "hook": "El hook principal aquí (máximo 2 oraciones)",
  "fullScript": "El guión completo aquí, estructurado por secciones con saltos de línea",
  "alternativeHooks": ["Hook alternativo 1", "Hook alternativo 2", "Hook alternativo 3"]
}

El fullScript debe incluir las 5 secciones (Hook, Problema, Solución, Demo, CTA) con emojis al inicio de cada sección.`
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
      // Try to extract JSON from the response
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
        hook: content.split('\n')[0] || 'Hook no generado',
        fullScript: content,
        alternativeHooks: []
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-full-script:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
