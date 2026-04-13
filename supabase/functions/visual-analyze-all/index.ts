import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface VisualAnalysisResult {
  producto_detectado: string;
  categoria: string;
  keywords: string[];
  confianza: number;
  descripcion_breve: string;
}

// Analyze video/thumbnail with Vision AI
async function analyzeWithVision(mediaUrl: string, isVideo: boolean = false): Promise<VisualAnalysisResult | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  const systemPrompt = `Eres un experto en comercio electrónico y TikTok Shop. Tu trabajo es analizar ${isVideo ? 'videos' : 'imágenes'} para identificar qué producto se está vendiendo o promocionando.

CATEGORÍAS VÁLIDAS:
- belleza (maquillaje, skincare, pestañas, uñas)
- moda (ropa, zapatos, accesorios, joyería)
- tecnologia (gadgets, auriculares, relojes, celulares)
- hogar (organizadores, cocina, decoración, limpieza)
- salud (suplementos, vitaminas, fitness, bienestar)
- otro (cualquier otra categoría)

INSTRUCCIONES:
1. Identifica el PRODUCTO PRINCIPAL visible
2. Extrae palabras clave específicas del producto (marca, tipo, características)
3. Asigna un nivel de confianza basado en qué tan claro es el producto
4. Si no hay producto claro, pon confianza < 0.5

Responde ÚNICAMENTE con JSON válido, sin texto adicional.`;

  const userPrompt = `Analiza ${isVideo ? 'este video' : 'esta imagen'} de un video de TikTok Shop. Identifica qué PRODUCTO se está vendiendo.

Responde en este formato JSON exacto:
{
  "producto_detectado": "nombre descriptivo del producto visible",
  "categoria": "una de: belleza, moda, tecnologia, hogar, salud, otro",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confianza": 0.0-1.0,
  "descripcion_breve": "descripción corta"
}`;

  try {
    const contentItem = isVideo 
      ? { type: 'video_url', video_url: { url: mediaUrl } }
      : { type: 'image_url', image_url: { url: mediaUrl } };

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
              contentItem
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { market = 'mx', limit = 100, onlyUnanalyzed = true, onlyUnmatched = false } = body;

    console.log(`🔍 Visual analysis: market=${market}, limit=${limit}, onlyUnanalyzed=${onlyUnanalyzed}`);

    // Build query for videos to analyze
    let query = supabase
      .from('videos')
      .select('id, video_url, video_mp4_url, thumbnail_url, title, rank, product_id')
      .eq('country', market)
      .order('rank', { ascending: true, nullsFirst: false })
      .limit(limit);

    // Filter by analysis status
    if (onlyUnanalyzed) {
      query = query.is('visual_analyzed_at', null);
    }

    // Filter by product match status
    if (onlyUnmatched) {
      query = query.is('product_id', null);
    }

    const { data: videos, error: videosError } = await query;

    if (videosError) throw new Error(`Videos error: ${videosError.message}`);

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No videos to analyze',
          analyzed: 0,
          total: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videos.length} videos to analyze visually`);

    let analyzed = 0;
    let failed = 0;
    const results: { videoId: string; detected: string; confidence: number }[] = [];

    for (const video of videos) {
      // Use thumbnail or video MP4 for analysis
      const mediaUrl = video.thumbnail_url || video.video_mp4_url;
      
      if (!mediaUrl) {
        console.log(`⏭️ Skipping video ${video.id} - no media URL`);
        failed++;
        continue;
      }

      const isVideo = !video.thumbnail_url && !!video.video_mp4_url;
      const visualAnalysis = await analyzeWithVision(mediaUrl, isVideo);
      
      if (!visualAnalysis) {
        console.log(`❌ Vision analysis failed for video ${video.id}`);
        failed++;
        continue;
      }

      // Update video with visual analysis data
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          visual_product_detected: visualAnalysis.producto_detectado,
          visual_confidence: visualAnalysis.confianza,
          visual_keywords: visualAnalysis.keywords,
          visual_analyzed_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (updateError) {
        console.error(`Update error for video ${video.id}:`, updateError);
        failed++;
        continue;
      }

      analyzed++;
      results.push({
        videoId: video.id,
        detected: visualAnalysis.producto_detectado,
        confidence: visualAnalysis.confianza
      });

      console.log(`✅ [${analyzed}/${videos.length}] ${visualAnalysis.producto_detectado} (${(visualAnalysis.confianza * 100).toFixed(0)}%)`);

      // Rate limiting - 1 request per 200ms to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const executionTimeMs = Date.now() - startTime;

    console.log(`🎬 Visual analysis complete: ${analyzed} analyzed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        market,
        total: videos.length,
        analyzed,
        failed,
        results: results.slice(0, 20), // Only return first 20 for response size
        executionTimeMs
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
