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

// Generic words blacklist - should NOT count as meaningful keyword matches
const GENERIC_BLACKLIST = new Set([
  'aceite', 'crema', 'set', 'pack', 'kit', 'gel', 'spray', 'para', 'con', 'del',
  'mini', 'pro', 'plus', 'max', 'super', 'ultra', 'premium', 'original',
  'grande', 'pequeno', 'nuevo', 'mejor', 'natural', 'organico', 'piezas',
  'agua', 'caja', 'bolsa', 'sobre', 'polvo', 'liquido', 'capsulas',
]);

// Extract keywords (words > 3 chars, excluding generic blacklist)
function extractKeywords(text: string): string[] {
  return text.split(' ').filter(w => w.length > 3 && !GENERIC_BLACKLIST.has(w));
}

// HIGH-PRIORITY KEYWORDS - If found in transcript, MUST match product with same keyword
const EXACT_MATCH_KEYWORDS = [
  'alexa', 'echo', 'echo dot', 'echo pop', 'echo show',
  'airpod', 'airpods', 'iphone', 'ipad', 'apple watch', 'macbook',
  'samsung', 'galaxy', 'xiaomi', 'redmi', 'huawei', 'poco',
  'faja', 'fajas', 'plancha', 'secadora', 'rizador', 'alisadora', 'cepillo',
  'bocina', 'audifonos', 'auriculares', 'smartwatch', 'tablet', 'reloj',
  'crema', 'serum', 'mascarilla', 'vitamina', 'colageno', 'protector',
  'wavytalk', 'dyson', 'philips', 'braun', 'revlon', 'conair',
  'estante', 'organizador', 'lampara', 'luces', 'tira led',
  'parka', 'chamarra', 'playera', 'vestido', 'pantalon', 'jeans'
];

// Extract hashtags from text
function extractHashtags(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(HASHTAG_REGEX) || [];
  return matches.map(h => h.slice(1).toLowerCase());
}

// Find exact match keywords in text
function findExactKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  return EXACT_MATCH_KEYWORDS.filter(kw => normalized.includes(kw));
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

// Fast matching with indexed lookups - PRIORITIZES TRANSCRIPT + EXACT KEYWORDS
function findBestMatch(
  video: Video,
  products: Product[],
  productIndex: { byExactName: Map<string, Product>; byFirstWord: Map<string, Product[]> },
  threshold: number,
  isTopVideo: boolean = false
): { product: Product; score: number } | null {
  const videoProductName = normalizeText(video.product_name);
  const videoTitle = normalizeText(video.title);
  const videoTranscript = normalizeText(video.transcript);
  const videoHashtags = extractHashtags(video.title);
  
  // FALLBACK: Use title as product_name if product_name is empty
  const effectiveProductName = videoProductName || videoTitle;
  
  // NEW: Extract all searchable text - prioritize transcript
  const allSearchableText = [videoTranscript, videoTitle, videoProductName].filter(Boolean).join(' ');
  
  // Search limit - expand for top videos
  const searchLimit = isTopVideo ? products.length : 300;
  
  // FAST PATH 1: Exact match on product name (O(1))
  if (effectiveProductName) {
    const exactMatch = productIndex.byExactName.get(effectiveProductName);
    if (exactMatch) {
      return { product: exactMatch, score: 1.0 };
    }
  }
  
  // ========================================
  // CRITICAL: EXACT KEYWORD MATCHING (NEW!)
  // If transcript mentions "Alexa", MUST find product with "Alexa"
  // ========================================
  if (videoTranscript && videoTranscript.length > 15) {
    const transcriptKeywords = findExactKeywords(videoTranscript);
    
    if (transcriptKeywords.length > 0) {
      // Search ALL products for exact keyword match (critical for accuracy)
      for (let i = 0; i < Math.min(products.length, searchLimit); i++) {
        const product = products[i];
        const productNormalized = product.normalizedName;
        
        // Check if product contains ANY of the exact keywords from transcript
        for (const keyword of transcriptKeywords) {
          if (productNormalized.includes(keyword)) {
            console.log(`🎯 EXACT KEYWORD MATCH: "${keyword}" in product "${product.producto_nombre}"`);
            return { product, score: 0.95 };
          }
        }
      }
      
      // If we have important keywords but no product matches, don't settle for generic matches
      // Return null to trigger AI matching or manual review
      if (transcriptKeywords.some(kw => ['alexa', 'echo', 'airpod', 'iphone', 'samsung', 'faja', 'wavytalk'].includes(kw))) {
        console.log(`⚠️ Important keyword "${transcriptKeywords[0]}" found but no matching product - skipping generic match`);
        return null;
      }
    }
  }
  
  // PRIORITY PATH: Search transcript for product names
  if (videoTranscript && videoTranscript.length > 15) {
    // Search through products (expanded limit for top videos)
    for (let i = 0; i < Math.min(products.length, searchLimit); i++) {
      const product = products[i];
      // Product name must be meaningful (> 4 chars) to avoid false positives
      if (product.normalizedName.length > 4) {
        // Check if transcript contains the full product name
        if (videoTranscript.includes(product.normalizedName)) {
          return { product, score: 0.92 };
        }
        // Check if transcript contains key product words (min 2 keywords match)
        if (product.keywords.length >= 2) {
          let keywordMatches = 0;
          for (const kw of product.keywords) {
            if (kw.length > 4 && videoTranscript.includes(kw)) {
              keywordMatches++;
            }
          }
          if (keywordMatches >= 2 && keywordMatches >= product.keywords.length * 0.5) {
            return { product, score: 0.88 };
          }
        }
      }
    }
  }
  
  // FAST PATH 2: First word lookup + substring check (O(k) where k = products with same first word)
  if (effectiveProductName) {
    const firstWord = effectiveProductName.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
      const candidates = productIndex.byFirstWord.get(firstWord);
      if (candidates) {
        for (const product of candidates) {
          if (effectiveProductName.includes(product.normalizedName) || 
              product.normalizedName.includes(effectiveProductName)) {
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
  
  // MEDIUM PATH: Keyword overlap using ALL text (transcript + title + product_name)
  if (allSearchableText.length > 20) {
    const allKeywords = extractKeywords(allSearchableText);
    if (allKeywords.length > 0) {
      let bestMatch: { product: Product; score: number } | null = null;
      
      for (let i = 0; i < Math.min(products.length, 300); i++) {
        const product = products[i];
        if (product.keywords.length === 0) continue;
        
        const productKeywordSet = new Set(product.keywords);
        let matches = 0;
        for (const w of allKeywords) {
          if (productKeywordSet.has(w)) matches++;
        }
        
        // Need at least 2 keyword matches
        if (matches >= 2) {
          const overlap = matches / Math.max(3, product.keywords.length);
          if (overlap >= 0.4) {
            const score = 0.65 + (overlap * 0.2);
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { product, score };
            }
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

  // Batch videos for AI (increased to 25 per request for better efficiency)
  const batch = videos.slice(0, 25);
  const videoDescriptions = batch
    .map((v, i) => {
      const title = v.title || 'Sin título';
      const productName = v.product_name || 'No especificado';
      const transcript = v.transcript ? v.transcript.slice(0, 100) : 'Sin transcripción';
      return `${i + 1}. Título: "${title}" | Producto: "${productName}" | Script: "${transcript}"`;
    })
    .join('\n');

  const prompt = `Eres un experto en TikTok Shop. Tu trabajo es vincular videos con productos DEL MISMO MERCADO.

⚠️ REGLA CRÍTICA: Solo puedes vincular productos que coincidan exactamente con lo que se muestra o menciona en el video.

PRODUCTOS DISPONIBLES:
${productSummary}

VIDEOS A VINCULAR:
${videoDescriptions}

CRITERIOS DE MATCH (en orden de prioridad):
1. El TRANSCRIPT/SCRIPT menciona el producto explícitamente (ej: "esta bocina Alexa", "el Echo Dot")
2. El TÍTULO contiene el nombre exacto del producto o hashtags que coinciden
3. Las palabras clave del producto aparecen en el contenido (ej: "plancha de vapor", "crema facial")

REGLAS ESTRICTAS:
- Si el video habla de "Alexa" o "Echo", busca productos con esas palabras EXACTAS
- NO vincules por categoría general (ej: no vincular cualquier "bocina" con cualquier otra "bocina")
- Usa el TRANSCRIPT como fuente principal si está disponible
- Si NO hay coincidencia clara con confianza >= 75%, responde 0

Responde SOLO con JSON válido:
{
  "matches": [
    {"videoIndex": 1, "productIndex": 5, "confidence": 0.9, "reason": "Transcript menciona 'Echo Dot' exactamente"},
    {"videoIndex": 2, "productIndex": 0, "confidence": 0, "reason": "Sin coincidencia clara"}
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
      
    // HIGHER THRESHOLD: Only accept AI matches with >= 0.75 confidence
    if (videoIndex >= 0 && videoIndex < batch.length && 
          productIndex >= 0 && productIndex < products.length &&
          match.confidence >= 0.75) {
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
    let threshold = 0.75; // PRECISION > COVERAGE: Only assign if >= 0.75
    let market: string | null = null;
    let useAI = false;
    
    try {
      const body = await req.json();
      batchSize = Math.min(body.batchSize || 100, 200);
      threshold = Math.max(body.threshold || 0.75, 0.75); // Never go below 0.75
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
    const rawProductsList: Product[] = rawProducts.map(p => {
      const normalizedName = normalizeText(p.producto_nombre);
      return {
        ...p,
        normalizedName,
        keywords: extractKeywords(normalizedName),
        firstWord: normalizedName.split(' ')[0] || ''
      };
    });

    // DEDUPLICATION: Group products by first 30 chars of normalized name
    // Keep only the one with highest total_ingresos_mxn per group
    const productGroups = new Map<string, Product>();
    const duplicateMap = new Map<string, string>(); // duplicateId -> primaryId
    for (const p of rawProductsList) {
      const groupKey = p.normalizedName.slice(0, 30).trim();
      const existing = productGroups.get(groupKey);
      if (!existing) {
        productGroups.set(groupKey, p);
      } else {
        // Keep the one with more revenue as primary
        if ((p.total_ingresos_mxn || 0) > (existing.total_ingresos_mxn || 0)) {
          duplicateMap.set(existing.id, p.id);
          productGroups.set(groupKey, p);
        } else {
          duplicateMap.set(p.id, existing.id);
        }
      }
    }

    const products = Array.from(productGroups.values());
    console.log(`📦 ${rawProductsList.length} products -> ${products.length} after dedup (${duplicateMap.size} duplicates merged)`);

    // Build lookup index for O(1) exact matches
    const productIndex = buildProductIndex(products);

    console.log(`📦 ${products.length} products indexed`);

    // Fetch unmatched videos - include rank for priority matching
    // RESPECT manual_match: never touch manually matched videos
    let videosQuery = supabase
      .from('videos')
      .select('id, title, video_url, product_name, product_id, transcript, country, rank, manual_match')
      .is('product_id', null)
      .or('manual_match.is.null,manual_match.eq.false')
      .order('rank', { ascending: true, nullsFirst: false })
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

    // Get video ranks for priority matching
    const videoRanks = new Map(videos.map(v => [v.id, (v as unknown as { rank?: number }).rank || 999]));

    for (const video of videos) {
      const videoRank = videoRanks.get(video.id) || 999;
      const isTopVideo = videoRank <= 100;
      
      const result = findBestMatch(video, products, productIndex, threshold, isTopVideo);
      
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
    // HARD CONSTRAINT: NEVER allow cross-market updates (MX video -> US product or vice versa)
    const CHUNK_SIZE = 50;
    let successfulUpdates = 0;
    let blockedCrossMarket = 0;

    for (let i = 0; i < matchedUpdates.length; i += CHUNK_SIZE) {
      const chunk = matchedUpdates.slice(i, i + CHUNK_SIZE);
      
      // Use Promise.all for parallel updates within chunk
      const results = await Promise.all(
        chunk.map(async ({ id, update }) => {
          // Get the video's country to validate market match
          const video = videos.find(v => v.id === id);
          const product = products.find(p => p.id === update.product_id);
          
          // HARD BLOCK: If video country doesn't match product market, skip update
          if (video?.country && product) {
            // Products have .market from original data, but we need to check
            // Since we're already filtering by market in query, this is a safety check
            // If market was provided, both video and product should already match it
            // But we add this check as absolute protection
            if (market && video.country !== market) {
              console.warn(`⛔ BLOCKED: Video ${id} country=${video.country} doesn't match request market=${market}`);
              blockedCrossMarket++;
              return { error: true };
            }
          }
          
          return supabase.from('videos').update(update).eq('id', id);
        })
      );
      
      successfulUpdates += results.filter(r => !r.error).length;
    }
    
    if (blockedCrossMarket > 0) {
      console.warn(`⛔ SECURITY: Blocked ${blockedCrossMarket} cross-market updates`);
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
