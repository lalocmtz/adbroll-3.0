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

interface AuditIssue {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  videoMp4Url: string | null;
  issueType: 'visual_mismatch' | 'transcript_mismatch' | 'low_confidence';
  assignedProduct: string;
  detectedProduct: string;
  confidence: number;
  reason: string;
}

// Normalize text for comparison
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  const userPrompt = `Analiza ${isVideo ? 'este video' : 'esta imagen'} de un video de TikTok Shop. Identifica qué PRODUCTO se está vendiendo o promocionando.

Responde en este formato JSON exacto:
{
  "producto_detectado": "nombre descriptivo del producto visible",
  "categoria": "una de: belleza, moda, tecnologia, hogar, salud, otro",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confianza": 0.0-1.0,
  "descripcion_breve": "descripción corta de lo que se ve"
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

// Check if visual product matches assigned product
function checkProductMatch(
  visualAnalysis: VisualAnalysisResult,
  assignedProductName: string
): { matches: boolean; reason: string } {
  const normalizedAssigned = normalizeText(assignedProductName);
  const normalizedDetected = normalizeText(visualAnalysis.producto_detectado);
  const detectedKeywords = visualAnalysis.keywords.map(k => normalizeText(k));
  
  // Check if assigned product appears in detected product or keywords
  const assignedWords = normalizedAssigned.split(' ').filter(w => w.length > 3);
  let matchingWords = 0;
  
  for (const word of assignedWords) {
    if (normalizedDetected.includes(word) || detectedKeywords.some(k => k.includes(word))) {
      matchingWords++;
    }
  }
  
  const matchRatio = assignedWords.length > 0 ? matchingWords / assignedWords.length : 0;
  
  if (matchRatio >= 0.5 || normalizedDetected.includes(normalizedAssigned.split(' ')[0])) {
    return { matches: true, reason: 'Producto visual coincide con asignado' };
  }
  
  // Check for category mismatch
  const assignedCategory = categorizeProduct(normalizedAssigned);
  if (assignedCategory !== visualAnalysis.categoria && visualAnalysis.confianza >= 0.7) {
    return { 
      matches: false, 
      reason: `Categoría visual (${visualAnalysis.categoria}) diferente a producto (${assignedCategory})` 
    };
  }
  
  if (visualAnalysis.confianza >= 0.75) {
    return { 
      matches: false, 
      reason: `Visual: "${visualAnalysis.producto_detectado}" ≠ Asignado: "${assignedProductName}"` 
    };
  }
  
  return { matches: true, reason: 'Confianza visual baja - no concluyente' };
}

// Simple product categorization
function categorizeProduct(productName: string): string {
  const name = productName.toLowerCase();
  
  if (/crema|serum|mascarilla|pestañ|uña|maquillaje|labial|skin|beauty|piel/.test(name)) return 'belleza';
  if (/chamarra|playera|vestido|pantalon|blusa|falda|zapato|tenis|parka|ropa/.test(name)) return 'moda';
  if (/alexa|echo|airpod|iphone|samsung|auricular|bocina|smartwatch|tablet|gadget/.test(name)) return 'tecnologia';
  if (/organizador|lampara|cocina|hogar|limpieza|decoracion|estante/.test(name)) return 'hogar';
  if (/vitamin|colagen|proteina|suplemento|magnesio|salud|fitness/.test(name)) return 'salud';
  
  return 'otro';
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
    const { productId, autoFix = false, limit = 50 } = body;

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Auditing videos for product ${productId}...`);

    // Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, producto_nombre, categoria, market')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get videos assigned to this product
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, video_url, video_mp4_url, thumbnail_url, title, transcript, rank, revenue_mxn')
      .eq('product_id', productId)
      .order('rank', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (videosError) throw new Error(`Videos error: ${videosError.message}`);

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No videos found for this product',
          totalVideos: 0,
          issues: [],
          fixed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📹 Found ${videos.length} videos to audit`);

    const issues: AuditIssue[] = [];
    let analyzed = 0;
    let fixed = 0;

    // Process videos with Vision AI
    for (const video of videos) {
      // Use thumbnail or video MP4 for analysis
      const mediaUrl = video.thumbnail_url || video.video_mp4_url;
      
      if (!mediaUrl) {
        console.log(`⏭️ Skipping video ${video.id} - no media URL`);
        continue;
      }

      const isVideo = !video.thumbnail_url && !!video.video_mp4_url;
      const visualAnalysis = await analyzeWithVision(mediaUrl, isVideo);
      
      if (!visualAnalysis) {
        console.log(`❌ Vision analysis failed for video ${video.id}`);
        continue;
      }

      analyzed++;

      // Update video with visual analysis data
      await supabase
        .from('videos')
        .update({
          visual_product_detected: visualAnalysis.producto_detectado,
          visual_confidence: visualAnalysis.confianza,
          visual_keywords: visualAnalysis.keywords,
          visual_analyzed_at: new Date().toISOString()
        })
        .eq('id', video.id);

      // Check if visual matches assigned product
      const matchResult = checkProductMatch(visualAnalysis, product.producto_nombre);
      
      if (!matchResult.matches) {
        const issue: AuditIssue = {
          videoId: video.id,
          videoUrl: video.video_url,
          thumbnailUrl: video.thumbnail_url,
          videoMp4Url: video.video_mp4_url,
          issueType: 'visual_mismatch',
          assignedProduct: product.producto_nombre,
          detectedProduct: visualAnalysis.producto_detectado,
          confidence: visualAnalysis.confianza,
          reason: matchResult.reason
        };
        
        issues.push(issue);
        console.log(`⚠️ MISMATCH: Video ${video.id} - ${matchResult.reason}`);

        // Auto-fix: Unlink video from product
        if (autoFix) {
          await supabase
            .from('videos')
            .update({ 
              product_id: null,
              product_name: null,
              ai_match_confidence: null,
              ai_match_attempted_at: null
            })
            .eq('id', video.id);
          
          fixed++;
          console.log(`🔧 Fixed: Unlinked video ${video.id}`);
        }
      }

      // Rate limiting - 1 request per 200ms
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const executionTimeMs = Date.now() - startTime;

    console.log(`✅ Audit complete: ${analyzed} analyzed, ${issues.length} issues, ${fixed} fixed`);

    return new Response(
      JSON.stringify({
        success: true,
        productId,
        productName: product.producto_nombre,
        totalVideos: videos.length,
        analyzed,
        issues,
        issuesCount: issues.length,
        fixed,
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
