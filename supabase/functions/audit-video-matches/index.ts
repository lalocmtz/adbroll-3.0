import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// High-priority keywords that MUST match if found in transcript
const EXACT_MATCH_KEYWORDS = [
  'alexa', 'echo', 'echo dot', 'echo pop', 'echo show',
  'airpod', 'airpods', 'iphone', 'ipad', 'apple watch',
  'samsung', 'galaxy', 'xiaomi', 'redmi', 'huawei',
  'faja', 'fajas', 'plancha', 'secadora', 'rizador', 'alisadora',
  'bocina', 'audifonos', 'auriculares', 'smartwatch', 'tablet',
  'crema', 'serum', 'mascarilla', 'vitamina', 'colageno',
  'wavytalk', 'dyson', 'philips', 'braun', 'revlon'
];

interface AuditIssue {
  videoId: string;
  videoRank: number | null;
  videoTitle: string | null;
  transcriptSnippet: string | null;
  productId: string | null;
  productName: string | null;
  productMarket: string | null;
  videoCountry: string | null;
  issueType: 'cross_market' | 'keyword_mismatch' | 'low_confidence' | 'missing_match';
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
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
    
    try {
      const body = await req.json();
      market = body.market || null;
      autoFix = body.autoFix || false;
      onlyTop = body.onlyTop || 100;
    } catch {
      // Use defaults
    }

    console.log(`🔍 Audit: market=${market || 'all'}, autoFix=${autoFix}, onlyTop=${onlyTop}`);

    const issues: AuditIssue[] = [];
    let fixedCount = 0;

    // ========================================
    // 1. CHECK CROSS-MARKET CONTAMINATION
    // ========================================
    console.log('📊 Checking cross-market contamination...');
    
    let crossMarketQuery = supabase
      .from('videos')
      .select(`
        id, rank, title, country, product_id, product_name, transcript,
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
      .select('id, rank, title, transcript, product_id, product_name, country')
      .not('product_id', 'is', null)
      .not('transcript', 'is', null)
      .order('rank', { ascending: true, nullsFirst: false })
      .limit(onlyTop);
    
    if (market) {
      topVideosQuery = topVideosQuery.eq('country', market);
    }

    const { data: topVideos, error: topError } = await topVideosQuery;
    
    if (topError) throw new Error(`Top videos check error: ${topError.message}`);

    const keywordMismatchVideos: string[] = [];
    
    for (const video of topVideos || []) {
      // Find keywords mentioned in transcript
      const transcriptKeywords = findKeywordsInText(video.transcript || '', EXACT_MATCH_KEYWORDS);
      
      if (transcriptKeywords.length > 0) {
        // Check if product name contains ANY of these keywords
        const productNormalized = normalizeText(video.product_name);
        const hasMatchingKeyword = transcriptKeywords.some(kw => productNormalized.includes(kw));
        
        if (!hasMatchingKeyword) {
          keywordMismatchVideos.push(video.id);
          issues.push({
            videoId: video.id,
            videoRank: video.rank,
            videoTitle: video.title,
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

    // ========================================
    // 3. CHECK LOW CONFIDENCE MATCHES IN TOP VIDEOS
    // ========================================
    console.log('📊 Checking low confidence matches in top videos...');
    
    let lowConfQuery = supabase
      .from('videos')
      .select('id, rank, title, transcript, product_id, product_name, ai_match_confidence, country')
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
      issues.push({
        videoId: video.id,
        videoRank: video.rank,
        videoTitle: video.title,
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
      .select('id, rank, title, transcript, country')
      .is('product_id', null)
      .not('rank', 'is', null)
      .not('transcript', 'is', null)
      .lte('rank', onlyTop)
      .order('rank', { ascending: true });
    
    if (market) {
      unmatchedQuery = unmatchedQuery.eq('country', market);
    }

    const { data: unmatchedVideos, error: unmatchedError } = await unmatchedQuery;
    
    if (unmatchedError) throw new Error(`Unmatched check error: ${unmatchedError.message}`);

    for (const video of unmatchedVideos || []) {
      // Check if transcript has important keywords
      const transcriptKeywords = findKeywordsInText(video.transcript || '', EXACT_MATCH_KEYWORDS);
      
      issues.push({
        videoId: video.id,
        videoRank: video.rank,
        videoTitle: video.title,
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
      executionTimeMs: Date.now() - startTime,
    };

    console.log(`🔍 Audit complete: ${summary.totalIssues} issues found, ${fixedCount} fixed`);
    console.log(`   Cross-market: ${summary.byType.crossMarket}`);
    console.log(`   Keyword mismatch: ${summary.byType.keywordMismatch}`);
    console.log(`   Low confidence: ${summary.byType.lowConfidence}`);
    console.log(`   Missing match: ${summary.byType.missingMatch}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        issues: issues.slice(0, 50), // Limit response size
        market: market || 'all',
        autoFixApplied: autoFix,
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
