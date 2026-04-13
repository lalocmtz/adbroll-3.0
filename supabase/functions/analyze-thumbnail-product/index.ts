import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisualAnalysisResult {
  producto_detectado: string;
  categoria: string;
  keywords: string[];
  confianza: number;
  descripcion_breve: string;
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

async function analyzeImageWithVision(imageUrl: string): Promise<VisualAnalysisResult | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  const systemPrompt = `Eres un experto en comercio electrónico y TikTok Shop. Tu trabajo es analizar imágenes de videos para identificar qué producto se está vendiendo o promocionando.

CATEGORÍAS VÁLIDAS:
- belleza (maquillaje, skincare, pestañas, uñas)
- moda (ropa, zapatos, accesorios, joyería)
- tecnologia (gadgets, auriculares, relojes, celulares)
- hogar (organizadores, cocina, decoración, limpieza)
- salud (suplementos, vitaminas, fitness, bienestar)
- otro (cualquier otra categoría)

INSTRUCCIONES:
1. Identifica el PRODUCTO PRINCIPAL visible en la imagen
2. Extrae palabras clave específicas del producto (marca, tipo, características)
3. Asigna un nivel de confianza basado en qué tan claro es el producto
4. Si la imagen es ambigua o no muestra un producto claro, pon confianza < 0.5

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`;

  const userPrompt = `Analiza esta imagen de un video de TikTok Shop. Identifica qué PRODUCTO se está vendiendo o promocionando.

Responde en este formato JSON exacto:
{
  "producto_detectado": "nombre descriptivo del producto visible",
  "categoria": "una de: belleza, moda, tecnologia, hogar, salud, otro",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confianza": 0.0-1.0,
  "descripcion_breve": "descripción corta de lo que se ve en la imagen"
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Vision API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    const cleaned = content
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    
    const parsed = JSON.parse(cleaned);
    
    return {
      producto_detectado: parsed.producto_detectado || '',
      categoria: parsed.categoria || 'otro',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      confianza: typeof parsed.confianza === 'number' ? parsed.confianza : 0,
      descripcion_breve: parsed.descripcion_breve || '',
    };
  } catch (error) {
    console.error('Vision analysis error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { thumbnailUrl, videoId } = body;

    if (!thumbnailUrl) {
      return new Response(
        JSON.stringify({ error: 'thumbnailUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Analyzing thumbnail for video ${videoId || 'unknown'}`);

    const result = await analyzeImageWithVision(thumbnailUrl);

    if (!result) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Vision analysis failed',
          videoId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Vision analysis complete: "${result.producto_detectado}" (${result.confianza * 100}% confidence)`);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        analysis: result,
        executionTimeMs: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
