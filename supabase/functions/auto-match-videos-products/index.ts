import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  producto_nombre: string;
  producto_url: string | null;
  categoria: string | null;
  price: number | null;
  commission: number | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  creators_count: number | null;
}

interface Video {
  id: string;
  title: string | null;
  video_url: string;
  product_name: string | null;
  product_id: string | null;
  category: string | null;
}

// Text normalization - removes accents, lowercase, trim
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[^\w\s]/gi, ' ') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract product URL from video URL or description if present
function extractProductUrl(videoUrl: string, title: string | null): string | null {
  const urlPattern = /https?:\/\/[^\s]+tiktokshop[^\s]*/gi;
  const productUrlPattern = /https?:\/\/[^\s]*product[^\s]*/gi;
  
  const combined = `${videoUrl} ${title || ''}`;
  const match = combined.match(urlPattern) || combined.match(productUrlPattern);
  return match ? match[0] : null;
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function levenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s1, s2) / maxLen;
}

// Calculate fuzzy match score between video and product
function calculateFuzzyScore(video: Video, product: Product): number {
  const videoTitle = normalizeText(video.title);
  const videoProductName = normalizeText(video.product_name);
  const productName = normalizeText(product.producto_nombre);
  const productCategory = normalizeText(product.categoria);
  const videoCategory = normalizeText(video.category);
  
  if (!productName) return 0;
  
  let maxScore = 0;
  
  // Score from video title vs product name
  if (videoTitle && productName) {
    // Exact containment
    if (videoTitle.includes(productName) || productName.includes(videoTitle)) {
      maxScore = Math.max(maxScore, 0.85);
    }
    
    // Word matching
    const productWords = productName.split(' ').filter(w => w.length > 2);
    const titleWords = new Set(videoTitle.split(' ').filter(w => w.length > 2));
    
    if (productWords.length > 0) {
      let matchedWords = 0;
      for (const pw of productWords) {
        for (const tw of titleWords) {
          if (pw === tw || levenshteinSimilarity(pw, tw) > 0.8) {
            matchedWords++;
            break;
          }
        }
      }
      const wordScore = matchedWords / productWords.length;
      maxScore = Math.max(maxScore, wordScore * 0.75);
    }
    
    // Overall string similarity
    const stringSimilarity = levenshteinSimilarity(videoTitle.substring(0, 50), productName);
    maxScore = Math.max(maxScore, stringSimilarity * 0.7);
  }
  
  // Score from video.product_name vs product name (higher weight - this is explicit)
  if (videoProductName && productName) {
    if (videoProductName === productName) {
      maxScore = Math.max(maxScore, 1.0);
    } else if (videoProductName.includes(productName) || productName.includes(videoProductName)) {
      maxScore = Math.max(maxScore, 0.9);
    } else {
      const similarity = levenshteinSimilarity(videoProductName, productName);
      maxScore = Math.max(maxScore, similarity * 0.85);
    }
  }
  
  // Category bonus
  if (videoCategory && productCategory && videoCategory === productCategory) {
    maxScore = Math.min(1.0, maxScore + 0.1);
  }
  
  return maxScore;
}

// Priority A: Direct URL match
function findDirectUrlMatch(video: Video, products: Product[]): Product | null {
  const extractedUrl = extractProductUrl(video.video_url, video.title);
  if (!extractedUrl) return null;
  
  for (const product of products) {
    if (product.producto_url && normalizeText(product.producto_url) === normalizeText(extractedUrl)) {
      return product;
    }
  }
  return null;
}

// Priority B: Fuzzy matching with score threshold
function findBestFuzzyMatch(video: Video, products: Product[], threshold: number = 0.55): { product: Product; score: number } | null {
  let bestMatch: { product: Product; score: number } | null = null;
  
  for (const product of products) {
    const score = calculateFuzzyScore(video, product);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
    }
  }
  
  return bestMatch;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get batch parameters
    let batchSize = 100;
    let offset = 0;
    let threshold = 0.55;
    
    try {
      const body = await req.json();
      batchSize = body.batchSize || 100;
      offset = body.offset || 0;
      threshold = body.threshold || 0.55;
    } catch {
      // Use defaults
    }

    console.log(`🔄 Auto-Matcher V2: offset=${offset}, batchSize=${batchSize}, threshold=${threshold}`);

    // Fetch ALL products (they're typically fewer than videos)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, producto_url, categoria, price, commission, total_ingresos_mxn, total_ventas, creators_count')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products found', matched: 0, complete: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${products.length} products for matching`);

    // Fetch unmatched videos in batch
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, video_url, product_name, product_id, category')
      .is('product_id', null)
      .range(offset, offset + batchSize - 1);

    if (videosError) {
      throw new Error(`Error fetching videos: ${videosError.message}`);
    }

    // Get total unmatched count
    const { count: totalUnmatched } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('product_id', null);

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No more unmatched videos', 
          matched: 0, 
          complete: true,
          totalUnmatched: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Processing ${videos.length} unmatched videos...`);

    let matchedCount = 0;
    let directMatches = 0;
    let fuzzyMatches = 0;
    let noMatches = 0;

    // Process each video with priority matching
    for (const video of videos) {
      // Priority A: Direct URL match
      let matchedProduct = findDirectUrlMatch(video, products);
      let matchScore = 1.0;
      let matchType = 'direct_url';

      // Priority B: Fuzzy matching if no direct match
      if (!matchedProduct) {
        const fuzzyResult = findBestFuzzyMatch(video, products, threshold);
        if (fuzzyResult) {
          matchedProduct = fuzzyResult.product;
          matchScore = fuzzyResult.score;
          matchType = 'fuzzy';
        }
      }

      if (matchedProduct) {
        matchedCount++;
        if (matchType === 'direct_url') {
          directMatches++;
        } else {
          fuzzyMatches++;
        }

        // Calculate earning_per_sale
        const earningPerSale = matchedProduct.price && matchedProduct.commission
          ? matchedProduct.price * (matchedProduct.commission / 100)
          : null;

        const { error: updateError } = await supabase
          .from('videos')
          .update({
            product_id: matchedProduct.id,
            product_name: matchedProduct.producto_nombre,
            product_price: matchedProduct.price,
            product_revenue: matchedProduct.total_ingresos_mxn,
            product_sales: matchedProduct.total_ventas,
            ai_match_confidence: matchScore,
            ai_match_attempted_at: new Date().toISOString(),
          })
          .eq('id', video.id);
        
        if (updateError) {
          console.error(`Error updating video ${video.id}:`, updateError.message);
        } else {
          console.log(`✓ Matched video to "${matchedProduct.producto_nombre}" (${matchType}, score: ${matchScore.toFixed(2)})`);
        }
      } else {
        noMatches++;
        // Mark as attempted but no match found
        await supabase
          .from('videos')
          .update({
            ai_match_attempted_at: new Date().toISOString(),
            ai_match_confidence: 0,
          })
          .eq('id', video.id);
      }
    }

    const remainingUnmatched = Math.max(0, (totalUnmatched || 0) - matchedCount);
    const complete = videos.length < batchSize;

    console.log(`✅ Batch complete: ${matchedCount}/${videos.length} matched (${directMatches} direct, ${fuzzyMatches} fuzzy, ${noMatches} no match)`);

    return new Response(
      JSON.stringify({
        success: true,
        batchProcessed: videos.length,
        matchedInBatch: matchedCount,
        directMatches,
        fuzzyMatches,
        noMatches,
        remainingUnmatched,
        complete,
        nextOffset: complete ? null : offset + batchSize,
        threshold,
        message: complete 
          ? `Matching complete! ${matchedCount} matched in final batch`
          : `Batch processed: ${matchedCount} matched, ${remainingUnmatched} remaining`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in auto-match-videos-products:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
