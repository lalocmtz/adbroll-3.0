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
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  normalizedName: string;
  keywords: string[];
  firstWord: string;
}

interface Video {
  id: string;
  title: string | null;
  video_url: string;
  product_name: string | null;
  product_id: string | null;
  transcript: string | null;
  country: string | null;
}

// Pre-compiled regex for hashtag extraction
const HASHTAG_REGEX = /#(\w+)/gi;

// Simple text normalization
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

// Extract keywords (words > 3 chars)
function extractKeywords(text: string): string[] {
  return text.split(' ').filter(w => w.length > 3);
}

// Extract hashtags from text
function extractHashtags(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(HASHTAG_REGEX) || [];
  return matches.map(h => h.slice(1).toLowerCase());
}

// Build product lookup index for O(1) exact matching
function buildProductIndex(products: Product[]): {
  byExactName: Map<string, Product>;
  byFirstWord: Map<string, Product[]>;
} {
  const byExactName = new Map<string, Product>();
  const byFirstWord = new Map<string, Product[]>();

  for (const product of products) {
    // Index by exact normalized name
    byExactName.set(product.normalizedName, product);
    
    // Index by first word for partial matching
    if (product.firstWord) {
      const existing = byFirstWord.get(product.firstWord) || [];
      existing.push(product);
      byFirstWord.set(product.firstWord, existing);
    }
  }

  return { byExactName, byFirstWord };
}

// Fast matching with indexed lookups
function findBestMatch(
  video: Video,
  products: Product[],
  productIndex: { byExactName: Map<string, Product>; byFirstWord: Map<string, Product[]> },
  threshold: number
): { product: Product; score: number } | null {
  const videoProductName = normalizeText(video.product_name);
  const videoTitle = normalizeText(video.title);
  const videoHashtags = extractHashtags(video.title);
  
  // FAST PATH 1: Exact match on product name (O(1))
  if (videoProductName) {
    const exactMatch = productIndex.byExactName.get(videoProductName);
    if (exactMatch) {
      return { product: exactMatch, score: 1.0 };
    }
  }
  
  // FAST PATH 2: First word lookup + substring check (O(k) where k = products with same first word)
  if (videoProductName) {
    const firstWord = videoProductName.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      const candidates = productIndex.byFirstWord.get(firstWord);
      if (candidates) {
        for (const product of candidates) {
          if (videoProductName.includes(product.normalizedName) || 
              product.normalizedName.includes(videoProductName)) {
            return { product, score: 0.9 };
          }
        }
      }
    }
  }
  
  // FAST PATH 3: Hashtag matches product first word
  for (const hashtag of videoHashtags) {
    if (hashtag.length > 2) {
      const candidates = productIndex.byFirstWord.get(hashtag);
      if (candidates && candidates.length > 0) {
        return { product: candidates[0], score: 0.85 };
      }
    }
  }
  
  // FAST PATH 4: Title contains product name (check high-revenue products first)
  if (videoTitle) {
    for (let i = 0; i < Math.min(products.length, 200); i++) {
      const product = products[i];
      if (product.normalizedName.length > 4 && videoTitle.includes(product.normalizedName)) {
        return { product, score: 0.8 };
      }
    }
  }
  
  // MEDIUM PATH: Keyword overlap (only if we have product name)
  if (videoProductName) {
    const vpKeywords = extractKeywords(videoProductName);
    if (vpKeywords.length > 0) {
      let bestMatch: { product: Product; score: number } | null = null;
      
      for (let i = 0; i < Math.min(products.length, 300); i++) {
        const product = products[i];
        if (product.keywords.length === 0) continue;
        
        const set2 = new Set(product.keywords);
        let matches = 0;
        for (const w of vpKeywords) {
          if (set2.has(w)) matches++;
        }
        
        const overlap = matches / Math.max(vpKeywords.length, product.keywords.length);
        if (overlap >= 0.5) {
          const score = 0.7 + (overlap * 0.2);
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { product, score };
          }
        }
      }
      
      if (bestMatch && bestMatch.score >= threshold) {
        return bestMatch;
      }
    }
  }
  
  return null;
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

    let batchSize = 100; // Increased from 20
    let threshold = 0.5;
    let market: string | null = null;
    
    try {
      const body = await req.json();
      batchSize = Math.min(body.batchSize || 100, 200);
      threshold = body.threshold || 0.5;
      market = body.market || null;
    } catch {
      // Use defaults
    }

    console.log(`🔄 Matcher: batch=${batchSize}, market=${market || 'all'}`);

    // Fetch products for the specific market (or all if not specified)
    let productsQuery = supabase
      .from('products')
      .select('id, producto_nombre, producto_url, categoria, price, total_ingresos_mxn, total_ventas')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });
    
    if (market) {
      productsQuery = productsQuery.eq('market', market);
    }

    const { data: rawProducts, error: productsError } = await productsQuery;

    if (productsError) throw new Error(`Products error: ${productsError.message}`);
    if (!rawProducts?.length) {
      return new Response(
        JSON.stringify({ message: 'No products', matched: 0, complete: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-compute normalized names, keywords, and first word for index
    const products: Product[] = rawProducts.map(p => {
      const normalizedName = normalizeText(p.producto_nombre);
      return {
        ...p,
        normalizedName,
        keywords: extractKeywords(normalizedName),
        firstWord: normalizedName.split(' ')[0] || ''
      };
    });

    // Build lookup index for O(1) exact matches
    const productIndex = buildProductIndex(products);

    console.log(`📦 ${products.length} products indexed`);

    // Fetch unmatched videos
    let videosQuery = supabase
      .from('videos')
      .select('id, title, video_url, product_name, product_id, transcript, country')
      .is('product_id', null)
      .order('revenue_mxn', { ascending: false, nullsFirst: false })
      .limit(batchSize);
    
    if (market) {
      videosQuery = videosQuery.eq('country', market);
    }

    const { data: videos, error: videosError } = await videosQuery;

    if (videosError) throw new Error(`Videos error: ${videosError.message}`);

    // Count remaining unmatched
    let countQuery = supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('product_id', null);
    
    if (market) {
      countQuery = countQuery.eq('country', market);
    }
    
    const { count: totalUnmatched } = await countQuery;

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ message: 'No unmatched videos', matched: 0, complete: true, totalUnmatched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Processing ${videos.length} videos...`);

    // Process all videos and collect updates
    const matchedUpdates: { id: string; update: Record<string, unknown> }[] = [];
    const unmatchedUpdates: { id: string }[] = [];

    for (const video of videos) {
      const result = findBestMatch(video, products, productIndex, threshold);
      
      if (result) {
        matchedUpdates.push({
          id: video.id,
          update: {
            product_id: result.product.id,
            product_name: result.product.producto_nombre,
            product_price: result.product.price,
            product_revenue: result.product.total_ingresos_mxn,
            product_sales: result.product.total_ventas,
            ai_match_confidence: result.score,
            ai_match_attempted_at: new Date().toISOString(),
          }
        });
      } else {
        unmatchedUpdates.push({ id: video.id });
      }
    }

    // Batch update matched videos (in chunks of 50)
    const CHUNK_SIZE = 50;
    let successfulUpdates = 0;

    for (let i = 0; i < matchedUpdates.length; i += CHUNK_SIZE) {
      const chunk = matchedUpdates.slice(i, i + CHUNK_SIZE);
      
      // Use Promise.all for parallel updates within chunk
      const results = await Promise.all(
        chunk.map(({ id, update }) => 
          supabase.from('videos').update(update).eq('id', id)
        )
      );
      
      successfulUpdates += results.filter(r => !r.error).length;
    }

    // Mark unmatched videos as attempted (batch)
    if (unmatchedUpdates.length > 0) {
      const unmatchedIds = unmatchedUpdates.map(u => u.id);
      for (let i = 0; i < unmatchedIds.length; i += CHUNK_SIZE) {
        const chunk = unmatchedIds.slice(i, i + CHUNK_SIZE);
        await supabase
          .from('videos')
          .update({
            ai_match_attempted_at: new Date().toISOString(),
            ai_match_confidence: 0,
          })
          .in('id', chunk);
      }
    }

    const remainingUnmatched = Math.max(0, (totalUnmatched || 0) - successfulUpdates);
    const complete = videos.length < batchSize;

    console.log(`✅ ${successfulUpdates}/${videos.length} matched in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        batchProcessed: videos.length,
        matchedInBatch: successfulUpdates,
        remainingUnmatched,
        complete,
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
