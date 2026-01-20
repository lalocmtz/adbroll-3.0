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

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// AI-powered matching for videos that fuzzy couldn't match
async function matchWithAI(
  videos: Video[], 
  products: Product[]
): Promise<Map<string, { productId: string; confidence: number }>> {
  const results = new Map<string, { productId: string; confidence: number }>();
  
  if (!LOVABLE_API_KEY || videos.length === 0) return results;

  // Create a compact product list for AI
  const productSummary = products
    .slice(0, 100)
    .map((p, i) => `${i + 1}. "${p.producto_nombre}" (${p.categoria || 'Sin categoría'})`)
    .join('\n');

  // Batch videos for AI (max 10 per request)
  const batch = videos.slice(0, 10);
  const videoDescriptions = batch
    .map((v, i) => `${i + 1}. Título: "${v.title || 'Sin título'}" | Producto mencionado: "${v.product_name || 'No especificado'}"`)
    .join('\n');

  const prompt = `Eres un experto en TikTok Shop México. Necesito que vincules videos con productos.

PRODUCTOS DISPONIBLES:
${productSummary}

VIDEOS A VINCULAR:
${videoDescriptions}

Para cada video, indica el número de producto que mejor coincide. Si no hay coincidencia clara, responde 0.

Responde SOLO con JSON válido en este formato:
{
  "matches": [
    {"videoIndex": 1, "productIndex": 5, "confidence": 0.9},
    {"videoIndex": 2, "productIndex": 0, "confidence": 0}
  ]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Eres un experto en e-commerce y TikTok Shop. Responde solo con JSON válido.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      console.warn('[AI Match] API error:', await response.text());
      return results;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    
    const parsed = JSON.parse(cleaned);
    const matches = parsed.matches || [];

    for (const match of matches) {
      const videoIndex = match.videoIndex - 1;
      const productIndex = match.productIndex - 1;
      
      if (videoIndex >= 0 && videoIndex < batch.length && 
          productIndex >= 0 && productIndex < products.length &&
          match.confidence > 0.5) {
        results.set(batch[videoIndex].id, {
          productId: products[productIndex].id,
          confidence: match.confidence
        });
      }
    }

    console.log(`[AI Match] Matched ${results.size}/${batch.length} videos`);
  } catch (error) {
    console.error('[AI Match] Error:', error);
  }

  return results;
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

    let batchSize = 100;
    let threshold = 0.5;
    let market: string | null = null;
    let useAI = false;
    
    try {
      const body = await req.json();
      batchSize = Math.min(body.batchSize || 100, 200);
      threshold = body.threshold || 0.5;
      market = body.market || null;
      useAI = body.useAI || false;
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
    const unmatchedVideos: Video[] = [];

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
        unmatchedVideos.push(video);
      }
    }

    // AI fallback for unmatched videos
    let aiMatched = 0;
    if (useAI && unmatchedVideos.length > 0 && LOVABLE_API_KEY) {
      console.log(`🤖 Trying AI match for ${unmatchedVideos.length} unmatched videos...`);
      const aiResults = await matchWithAI(unmatchedVideos, products);
      
      for (const [videoId, match] of aiResults) {
        const product = products.find(p => p.id === match.productId);
        if (product) {
          matchedUpdates.push({
            id: videoId,
            update: {
              product_id: product.id,
              product_name: product.producto_nombre,
              product_price: product.price,
              product_revenue: product.total_ingresos_mxn,
              product_sales: product.total_ventas,
              ai_match_confidence: match.confidence,
              ai_match_attempted_at: new Date().toISOString(),
            }
          });
          aiMatched++;
        }
      }
      console.log(`🤖 AI matched ${aiMatched} additional videos`);
    }

    // Collect truly unmatched videos (after AI attempt)
    const matchedIds = new Set(matchedUpdates.map(m => m.id));
    const unmatchedUpdates = unmatchedVideos
      .filter(v => !matchedIds.has(v.id))
      .map(v => ({ id: v.id }));

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

    console.log(`✅ ${successfulUpdates}/${videos.length} matched (${aiMatched} via AI) in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        batchProcessed: videos.length,
        matchedInBatch: successfulUpdates,
        fuzzyMatched: successfulUpdates - aiMatched,
        aiMatched,
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
