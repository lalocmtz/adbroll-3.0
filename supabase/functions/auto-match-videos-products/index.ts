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
  normalizedName?: string;
  keywords?: string[];
}

interface Video {
  id: string;
  title: string | null;
  video_url: string;
  product_name: string | null;
  product_id: string | null;
  category: string | null;
  transcript: string | null;
}

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

// FAST: Simple word overlap score
function quickWordOverlap(words1: string[], words2: string[]): number {
  if (words1.length === 0 || words2.length === 0) return 0;
  const set2 = new Set(words2);
  let matches = 0;
  for (const w of words1) {
    if (set2.has(w)) matches++;
  }
  return matches / Math.max(words1.length, words2.length);
}

// FAST: Check substring containment
function hasSubstringMatch(videoText: string, productName: string): boolean {
  return videoText.includes(productName) || productName.includes(videoText);
}

// Calculate match score using FAST operations
function calculateFastScore(
  videoTitle: string, 
  videoTitleKeywords: string[],
  videoProductName: string,
  videoTranscript: string,
  product: Product
): number {
  const productName = product.normalizedName || '';
  const productKeywords = product.keywords || [];
  
  if (!productName) return 0;
  
  // Check 1: Exact product name match
  if (videoProductName && videoProductName === productName) {
    return 1.0;
  }
  
  // Check 2: Product name substring in video product name
  if (videoProductName && (videoProductName.includes(productName) || productName.includes(videoProductName))) {
    return 0.9;
  }
  
  // Check 3: Product name substring in title
  if (videoTitle && hasSubstringMatch(videoTitle, productName)) {
    return 0.8;
  }
  
  // Check 4: Keyword overlap with video product name
  if (videoProductName) {
    const vpKeywords = extractKeywords(videoProductName);
    const overlap = quickWordOverlap(vpKeywords, productKeywords);
    if (overlap >= 0.5) {
      return 0.7 + (overlap * 0.2);
    }
  }
  
  // Check 5: Product name in transcript
  if (videoTranscript && hasSubstringMatch(videoTranscript, productName)) {
    return 0.7;
  }
  
  // Check 6: Keyword overlap with transcript
  if (videoTranscript && productKeywords.length > 0) {
    const transcriptKeywords = extractKeywords(videoTranscript.substring(0, 500));
    const overlap = quickWordOverlap(transcriptKeywords, productKeywords);
    if (overlap >= 0.3) {
      return 0.55 + (overlap * 0.25);
    }
  }
  
  // Check 7: Keyword overlap with title
  if (videoTitleKeywords.length > 0 && productKeywords.length > 0) {
    const overlap = quickWordOverlap(videoTitleKeywords, productKeywords);
    if (overlap >= 0.3) {
      return 0.5 + (overlap * 0.3);
    }
  }
  
  return 0;
}

// Find best match using FAST algorithm
function findBestFastMatch(
  video: Video, 
  products: Product[], 
  threshold: number
): { product: Product; score: number } | null {
  const videoTitle = normalizeText(video.title);
  const videoTitleKeywords = extractKeywords(videoTitle);
  const videoProductName = normalizeText(video.product_name);
  const videoTranscript = normalizeText(video.transcript);
  
  let bestMatch: { product: Product; score: number } | null = null;
  
  for (const product of products) {
    const score = calculateFastScore(videoTitle, videoTitleKeywords, videoProductName, videoTranscript, product);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
      if (score >= 0.95) break;
    }
  }
  
  return bestMatch;
}

// AI matching using OpenAI with transcript support
async function findAIMatch(
  video: Video, 
  products: Product[], 
  openAIKey: string
): Promise<{ product: Product; score: number } | null> {
  if (!openAIKey) return null;
  
  // Top 30 products by revenue for AI matching
  const productList = products.slice(0, 30).map((p, idx) => ({
    index: idx,
    name: p.producto_nombre
  }));
  
  // Build context from available data
  const titlePart = video.title ? `TÍTULO: "${video.title}"` : '';
  const productNamePart = video.product_name ? `PRODUCTO MENCIONADO: "${video.product_name}"` : '';
  const transcriptPart = video.transcript 
    ? `TRANSCRIPCIÓN: "${video.transcript.substring(0, 600)}"` 
    : '';
  
  const videoContext = [titlePart, productNamePart, transcriptPart].filter(Boolean).join('\n');
  
  if (!videoContext.trim()) {
    console.log(`⚠️ Video ${video.id} sin contexto para AI`);
    return null;
  }
  
  const prompt = `Analiza este video de TikTok Shop y determina qué producto está promocionando.

${videoContext}

PRODUCTOS DISPONIBLES:
${productList.map(p => `${p.index}. ${p.name}`).join('\n')}

Responde SOLO con el número del producto que mejor coincide, o NONE si ninguno coincide claramente:`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 5,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ OpenAI error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    
    if (!answer || answer.toUpperCase() === 'NONE') {
      return null;
    }
    
    // Extract number from response (handles "0", "0.", etc.)
    const numMatch = answer.match(/^\d+/);
    if (!numMatch) return null;
    
    const productIndex = parseInt(numMatch[0], 10);
    if (isNaN(productIndex) || productIndex < 0 || productIndex >= productList.length) {
      return null;
    }
    
    console.log(`🤖 AI matched: "${products[productIndex].producto_nombre}"`);
    return { product: products[productIndex], score: 0.75 };
    
  } catch (error) {
    console.error('AI match error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 8000; // 8 seconds

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIKey = Deno.env.get('OPENAI_API_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let batchSize = 20;
    let offset = 0;
    let threshold = 0.5;
    let useAI = false;
    
    try {
      const body = await req.json();
      batchSize = Math.min(body.batchSize || 20, 30);
      offset = body.offset || 0;
      threshold = body.threshold || 0.5;
      useAI = body.useAI === true;
    } catch {
      // Use defaults
    }

    // Smaller batch with AI
    if (useAI && openAIKey) {
      batchSize = Math.min(batchSize, 10);
    }

    console.log(`🔄 Matcher: offset=${offset}, batch=${batchSize}, AI=${useAI && !!openAIKey}`);

    // Fetch products and pre-compute normalized names
    const { data: rawProducts, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, producto_url, categoria, price, commission, total_ingresos_mxn, total_ventas, creators_count')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });

    if (productsError) throw new Error(`Products error: ${productsError.message}`);
    if (!rawProducts?.length) {
      return new Response(
        JSON.stringify({ message: 'No products', matched: 0, complete: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pre-compute normalized names and keywords
    const products: Product[] = rawProducts.map(p => ({
      ...p,
      normalizedName: normalizeText(p.producto_nombre),
      keywords: extractKeywords(normalizeText(p.producto_nombre))
    }));

    console.log(`📦 ${products.length} products ready`);

    // Fetch unmatched videos WITH transcript
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, video_url, product_name, product_id, category, revenue_mxn, transcript')
      .is('product_id', null)
      .order('revenue_mxn', { ascending: false, nullsFirst: false })
      .range(offset, offset + batchSize - 1);

    if (videosError) throw new Error(`Videos error: ${videosError.message}`);

    const { count: totalUnmatched } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('product_id', null);

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ message: 'No unmatched videos', matched: 0, complete: true, totalUnmatched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Processing ${videos.length} videos...`);

    let matchedCount = 0;
    let fuzzyMatches = 0;
    let aiMatches = 0;
    let processedCount = 0;
    let timedOut = false;
    let skippedNoContext = 0;

    for (const video of videos) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Timeout at ${processedCount}`);
        timedOut = true;
        break;
      }

      processedCount++;
      let matchedProduct: Product | null = null;
      let matchScore = 0;
      let matchType = 'none';

      // Fast matching first
      const fastResult = findBestFastMatch(video, products, threshold);
      if (fastResult) {
        matchedProduct = fastResult.product;
        matchScore = fastResult.score;
        matchType = 'fuzzy';
      }

      // AI matching if:
      // 1. Fast matching failed AND
      // 2. AI is enabled AND
      // 3. Video has SOME context (title, product_name, OR transcript)
      const hasContext = video.title || video.product_name || video.transcript;
      
      if (!matchedProduct && useAI && openAIKey && hasContext) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME - 2500) {
          timedOut = true;
          break;
        }
        const aiResult = await findAIMatch(video, products, openAIKey);
        if (aiResult) {
          matchedProduct = aiResult.product;
          matchScore = aiResult.score;
          matchType = 'ai';
        }
      } else if (!matchedProduct && !hasContext) {
        skippedNoContext++;
      }

      if (matchedProduct) {
        matchedCount++;
        if (matchType === 'fuzzy') fuzzyMatches++;
        else if (matchType === 'ai') aiMatches++;

        await supabase
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
      } else {
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
    const complete = !timedOut && videos.length < batchSize;

    console.log(`✅ ${matchedCount}/${processedCount} matched (${fuzzyMatches} fuzzy, ${aiMatches} AI, ${skippedNoContext} sin contexto)`);

    return new Response(
      JSON.stringify({
        success: true,
        batchProcessed: processedCount,
        matchedInBatch: matchedCount,
        fuzzyMatches,
        aiMatches,
        skippedNoContext,
        remainingUnmatched,
        complete,
        timedOut,
        nextOffset: complete ? null : offset + processedCount,
        aiEnabled: useAI && !!openAIKey,
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
