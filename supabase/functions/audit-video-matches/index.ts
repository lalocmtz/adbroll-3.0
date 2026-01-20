import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// High-priority keywords that MUST match if found in transcript
const EXACT_MATCH_KEYWORDS = [
  'alexa', 'echo', 'echo dot', 'echo pop', 'echo show',
  'airpod', 'airpods', 'iphone', 'ipad', 'apple watch',
  'samsung', 'galaxy', 'xiaomi', 'redmi', 'huawei',
  'faja', 'fajas', 'plancha', 'secadora', 'rizador', 'alisadora',
  'bocina', 'audifonos', 'auriculares', 'smartwatch', 'tablet',
  'crema', 'serum', 'mascarilla', 'vitamina', 'colageno',
  'wavytalk', 'dyson', 'philips', 'braun', 'revlon',
  'magnesio', 'pestanas', 'fitness', 'gym'
];

interface AuditIssue {
  videoId: string;
  videoRank: number | null;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  transcriptSnippet: string | null;
  productId: string | null;
  productName: string | null;
  productMarket: string | null;
  videoCountry: string | null;
  issueType: 'cross_market' | 'keyword_mismatch' | 'low_confidence' | 'missing_match' | 'visual_mismatch';
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  visualAnalysis?: {
    productoDetectado: string;
    confianza: number;
    keywords: string[];
  };
}

interface VisualAnalysisResult {
  producto_detectado: string;
  categoria: string;
  keywords: string[];
  confianza: number;
  descripcion_breve: string;
}

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

function findKeywordsInText(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords.filter(kw => normalized.includes(kw.toLowerCase()));
}

// Analyze thumbnail with Gemini Vision
async function analyzeWithVision(thumbnailUrl: string): Promise<VisualAnalysisResult | null> {
  if (!LOVABLE_API_KEY || !thumbnailUrl) return null;

  const systemPrompt = `Eres un experto en comercio electrónico y TikTok Shop. Identifica qué producto se vende en la imagen.

CATEGORÍAS: belleza, moda, tecnologia, hogar, salud, otro

Responde SOLO JSON:
{
  "producto_detectado": "nombre del producto",
  "categoria": "categoria",
  "keywords": ["keyword1", "keyword2"],
  "confianza": 0.0-1.0,
  "descripcion_breve": "descripcion"
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
              { type: 'text', text: 'Analiza qué producto se está vendiendo en esta imagen de TikTok.' },
              { type: 'image_url', image_url: { url: thumbnailUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Check if visual product matches assigned product
function checkVisualMatch(
  visualAnalysis: VisualAnalysisResult,
  productName: string | null
): { matches: boolean; reason: string } {
  if (!productName) return { matches: false, reason: 'No product assigned' };
  
  const productNormalized = normalizeText(productName);
  const visualNormalized = normalizeText(visualAnalysis.producto_detectado);
  
  // Check if any visual keyword is in product name
  for (const kw of visualAnalysis.keywords) {
    if (kw.length > 3 && productNormalized.includes(normalizeText(kw))) {
      return { matches: true, reason: `Keyword "${kw}" found in product` };
    }
  }
  
  // Check if visual product name overlaps with assigned product
  const visualWords = visualNormalized.split(' ').filter(w => w.length > 3);
  for (const word of visualWords) {
    if (productNormalized.includes(word)) {
      return { matches: true, reason: `Word "${word}" found in product` };
    }
  }
  
  // Check for category-based matches (loose matching)
  const productWords = productNormalized.split(' ');
  const commonWords = visualWords.filter(w => productWords.some(pw => pw.includes(w) || w.includes(pw)));
  if (commonWords.length >= 2) {
    return { matches: true, reason: `Multiple words overlap: ${commonWords.join(', ')}` };
  }
  
  return { 
    matches: false, 
    reason: `Visual: "${visualAnalysis.producto_detectado}" vs Product: "${productName}"`
  };
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

    let market: string | null = null;
    let autoFix = false;
    let onlyTop = 100;
    let useVision = false;
    
    try {
      const body = await req.json();
      market = body.market || null;
      autoFix = body.autoFix || false;
      onlyTop = body.onlyTop || 100;
      useVision = body.useVision || false;
    } catch {
      // Use defaults
    }

    console.log(`🔍 Audit: market=${market || 'all'}, autoFix=${autoFix}, onlyTop=${onlyTop}, useVision=${useVision}`);

    const issues: AuditIssue[] = [];
    let fixedCount = 0;
    let visionAnalyzedCount = 0;

    // ========================================
    // 1. CHECK CROSS-MARKET CONTAMINATION
    // ========================================
    console.log('📊 Checking cross-market contamination...');
    
    let crossMarketQuery = supabase
      .from('videos')
      .select(`
        id, rank, title, country, product_id, product_name, transcript, thumbnail_url,
        products:product_id (id, producto_nombre, market)
      `)
      .not('product_id', 'is', null);
    
    if (market) {
      crossMarketQuery = crossMarketQuery.eq('country', market);
    }

    const { data: videosWithProducts, error: crossError } = await crossMarketQuery;
    
    if (crossError) throw new Error(`Cross-market check error: ${crossError.message}`);

    const crossMarketVideos: string[] = [];
    
    for (const video of videosWithProducts || []) {
      const product = video.products as unknown as { id: string; producto_nombre: string; market: string } | null;
      if (product && video.country && product.market && video.country !== product.market) {
        crossMarketVideos.push(video.id);
        issues.push({
          videoId: video.id,
          videoRank: video.rank,
          videoTitle: video.title,
          thumbnailUrl: video.thumbnail_url,
          transcriptSnippet: video.transcript?.slice(0, 100) || null,
          productId: video.product_id,
          productName: video.product_name,
          productMarket: product.market,
          videoCountry: video.country,
          issueType: 'cross_market',
          severity: 'critical',
          details: `Video ${video.country} linked to product ${product.market}`
        });
      }
    }

    // Auto-fix cross-market contamination
    if (autoFix && crossMarketVideos.length > 0) {
      const { error: fixError } = await supabase
        .from('videos')
        .update({
          product_id: null,
          product_name: null,
          ai_match_confidence: null,
          ai_match_attempted_at: null
        })
        .in('id', crossMarketVideos);
      
      if (!fixError) {
        fixedCount += crossMarketVideos.length;
        console.log(`✅ Fixed ${crossMarketVideos.length} cross-market contaminations`);
      }
    }

    // ========================================
    // 2. CHECK KEYWORD MISMATCHES IN TOP VIDEOS
    // ========================================
    console.log('📊 Checking keyword mismatches in top videos...');
    
    let topVideosQuery = supabase
      .from('videos')
      .select('id, rank, title, transcript, product_id, product_name, country, thumbnail_url')
      .not('product_id', 'is', null)
      .order('rank', { ascending: true, nullsFirst: false })
      .limit(onlyTop);
    
    if (market) {
      topVideosQuery = topVideosQuery.eq('country', market);
    }

    const { data: topVideos, error: topError } = await topVideosQuery;
    
    if (topError) throw new Error(`Top videos check error: ${topError.message}`);

    const keywordMismatchVideos: string[] = [];
    const visualMismatchVideos: string[] = [];
    
    for (const video of topVideos || []) {
      // Check transcript keyword mismatches (only if transcript exists)
      if (video.transcript) {
        const transcriptKeywords = findKeywordsInText(video.transcript, EXACT_MATCH_KEYWORDS);
        
        if (transcriptKeywords.length > 0) {
          const productNormalized = normalizeText(video.product_name);
          const hasMatchingKeyword = transcriptKeywords.some(kw => productNormalized.includes(kw));
          
          if (!hasMatchingKeyword) {
            keywordMismatchVideos.push(video.id);
            issues.push({
              videoId: video.id,
              videoRank: video.rank,
              videoTitle: video.title,
              thumbnailUrl: video.thumbnail_url,
              transcriptSnippet: video.transcript?.slice(0, 150) || null,
              productId: video.product_id,
              productName: video.product_name,
              productMarket: null,
              videoCountry: video.country,
              issueType: 'keyword_mismatch',
              severity: video.rank && video.rank <= 20 ? 'critical' : 'high',
              details: `Transcript mentions "${transcriptKeywords.join(', ')}" but product is "${video.product_name}"`
            });
          }
        }
      }
      
      // ========================================
      // VISION ANALYSIS (NEW!)
      // Only for TOP videos without good transcript match OR no transcript
      // ========================================
      if (useVision && video.thumbnail_url) {
        const shouldAnalyzeVisually = 
          !video.transcript || // No transcript - must use vision
          video.transcript.length < 50 || // Very short transcript
          keywordMismatchVideos.includes(video.id); // Already flagged as mismatch
        
        // Analyze TOP 50 videos visually (budget control)
        if (shouldAnalyzeVisually && video.rank && video.rank <= 50) {
          console.log(`🔍 Vision analyzing rank #${video.rank}: ${video.title?.slice(0, 30)}...`);
          
          const visualAnalysis = await analyzeWithVision(video.thumbnail_url);
          visionAnalyzedCount++;
          
          if (visualAnalysis && visualAnalysis.confianza >= 0.6) {
            const matchCheck = checkVisualMatch(visualAnalysis, video.product_name);
            
            if (!matchCheck.matches) {
              visualMismatchVideos.push(video.id);
              
              // Don't duplicate if already in keyword mismatch
              if (!keywordMismatchVideos.includes(video.id)) {
                issues.push({
                  videoId: video.id,
                  videoRank: video.rank,
                  videoTitle: video.title,
                  thumbnailUrl: video.thumbnail_url,
                  transcriptSnippet: video.transcript?.slice(0, 100) || null,
                  productId: video.product_id,
                  productName: video.product_name,
                  productMarket: null,
                  videoCountry: video.country,
                  issueType: 'visual_mismatch',
                  severity: video.rank <= 10 ? 'critical' : 'high',
                  details: matchCheck.reason,
                  visualAnalysis: {
                    productoDetectado: visualAnalysis.producto_detectado,
                    confianza: visualAnalysis.confianza,
                    keywords: visualAnalysis.keywords,
                  }
                });
              }
            }
          }
        }
      }
    }

    // Auto-fix keyword mismatches (unlink for re-matching)
    if (autoFix && keywordMismatchVideos.length > 0) {
      const { error: fixError } = await supabase
        .from('videos')
        .update({
          product_id: null,
          product_name: null,
          ai_match_confidence: null,
          ai_match_attempted_at: null
        })
        .in('id', keywordMismatchVideos);
      
      if (!fixError) {
        fixedCount += keywordMismatchVideos.length;
        console.log(`✅ Unlinked ${keywordMismatchVideos.length} keyword mismatch videos for re-matching`);
      }
    }

    // Auto-fix visual mismatches (unlink for re-matching)
    if (autoFix && visualMismatchVideos.length > 0) {
      // Filter out already unlinked
      const newVisualMismatches = visualMismatchVideos.filter(id => !keywordMismatchVideos.includes(id));
      if (newVisualMismatches.length > 0) {
        const { error: fixError } = await supabase
          .from('videos')
          .update({
            product_id: null,
            product_name: null,
            ai_match_confidence: null,
            ai_match_attempted_at: null
          })
          .in('id', newVisualMismatches);
        
        if (!fixError) {
          fixedCount += newVisualMismatches.length;
          console.log(`✅ Unlinked ${newVisualMismatches.length} visual mismatch videos for re-matching`);
        }
      }
    }

    // ========================================
    // 3. CHECK LOW CONFIDENCE MATCHES IN TOP VIDEOS
    // ========================================
    console.log('📊 Checking low confidence matches in top videos...');
    
    let lowConfQuery = supabase
      .from('videos')
      .select('id, rank, title, transcript, product_id, product_name, ai_match_confidence, country, thumbnail_url')
      .not('product_id', 'is', null)
      .lt('ai_match_confidence', 0.7)
      .not('rank', 'is', null)
      .lte('rank', onlyTop)
      .order('rank', { ascending: true });
    
    if (market) {
      lowConfQuery = lowConfQuery.eq('country', market);
    }

    const { data: lowConfVideos, error: lowConfError } = await lowConfQuery;
    
    if (lowConfError) throw new Error(`Low confidence check error: ${lowConfError.message}`);

    for (const video of lowConfVideos || []) {
      // Skip if already flagged
      if (keywordMismatchVideos.includes(video.id) || visualMismatchVideos.includes(video.id)) continue;
      
      issues.push({
        videoId: video.id,
        videoRank: video.rank,
        videoTitle: video.title,
        thumbnailUrl: video.thumbnail_url,
        transcriptSnippet: video.transcript?.slice(0, 100) || null,
        productId: video.product_id,
        productName: video.product_name,
        productMarket: null,
        videoCountry: video.country,
        issueType: 'low_confidence',
        severity: video.rank && video.rank <= 10 ? 'high' : 'medium',
        details: `Confidence ${((video.ai_match_confidence || 0) * 100).toFixed(1)}% for top ${video.rank} video`
      });
    }

    // ========================================
    // 4. CHECK TOP VIDEOS WITHOUT MATCHES
    // ========================================
    console.log('📊 Checking top videos without matches...');
    
    let unmatchedQuery = supabase
      .from('videos')
      .select('id, rank, title, transcript, country, thumbnail_url')
      .is('product_id', null)
      .not('rank', 'is', null)
      .lte('rank', onlyTop)
      .order('rank', { ascending: true });
    
    if (market) {
      unmatchedQuery = unmatchedQuery.eq('country', market);
    }

    const { data: unmatchedVideos, error: unmatchedError } = await unmatchedQuery;
    
    if (unmatchedError) throw new Error(`Unmatched check error: ${unmatchedError.message}`);

    for (const video of unmatchedVideos || []) {
      const transcriptKeywords = video.transcript 
        ? findKeywordsInText(video.transcript, EXACT_MATCH_KEYWORDS)
        : [];
      
      issues.push({
        videoId: video.id,
        videoRank: video.rank,
        videoTitle: video.title,
        thumbnailUrl: video.thumbnail_url,
        transcriptSnippet: video.transcript?.slice(0, 100) || null,
        productId: null,
        productName: null,
        productMarket: null,
        videoCountry: video.country,
        issueType: 'missing_match',
        severity: video.rank && video.rank <= 10 ? 'high' : 'medium',
        details: transcriptKeywords.length > 0 
          ? `Top ${video.rank} video mentions "${transcriptKeywords.join(', ')}" but has no product linked`
          : `Top ${video.rank} video has no product linked`
      });
    }

    // ========================================
    // GENERATE SUMMARY
    // ========================================
    const summary = {
      totalIssues: issues.length,
      byType: {
        crossMarket: issues.filter(i => i.issueType === 'cross_market').length,
        keywordMismatch: issues.filter(i => i.issueType === 'keyword_mismatch').length,
        visualMismatch: issues.filter(i => i.issueType === 'visual_mismatch').length,
        lowConfidence: issues.filter(i => i.issueType === 'low_confidence').length,
        missingMatch: issues.filter(i => i.issueType === 'missing_match').length,
      },
      bySeverity: {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
      },
      fixedCount,
      visionAnalyzedCount,
      executionTimeMs: Date.now() - startTime,
    };

    console.log(`🔍 Audit complete: ${summary.totalIssues} issues found, ${fixedCount} fixed`);
    console.log(`   Cross-market: ${summary.byType.crossMarket}`);
    console.log(`   Keyword mismatch: ${summary.byType.keywordMismatch}`);
    console.log(`   Visual mismatch: ${summary.byType.visualMismatch}`);
    console.log(`   Low confidence: ${summary.byType.lowConfidence}`);
    console.log(`   Missing match: ${summary.byType.missingMatch}`);
    if (useVision) console.log(`   Vision analyzed: ${visionAnalyzedCount} videos`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        issues: issues.slice(0, 100), // Limit response size
        market: market || 'all',
        autoFixApplied: autoFix,
        visionEnabled: useVision,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
