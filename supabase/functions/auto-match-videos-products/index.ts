import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  producto_nombre: string;
  categoria: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  commission: number | null;
  price: number | null;
}

interface Video {
  id: string;
  title: string | null;
  product_name: string | null;
  product_id: string | null;
}

// Optimized fuzzy matching - simpler and faster
function calculateMatchScore(videoText: string, productName: string): number {
  if (!videoText || !productName) return 0;

  const v = videoText.toLowerCase().trim();
  const p = productName.toLowerCase().trim();

  // Exact match
  if (v === p) return 1.0;

  // Clean strings
  const clean = (s: string) => s
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\sáéíóúñü]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const vClean = clean(v);
  const pClean = clean(p);

  // Direct containment
  if (vClean.includes(pClean) || pClean.includes(vClean)) return 0.9;

  // Simple word matching (faster than Levenshtein)
  const stopWords = new Set(['de', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'con', 'y', 'o', 'en', 'a', 'del', 'al', 'por', 'que', 'se', 'es', 'su']);
  
  const extractWords = (s: string): string[] => 
    s.split(' ').filter(w => w.length > 2 && !stopWords.has(w));

  const productWords = extractWords(pClean);
  const videoWords = new Set(extractWords(vClean));

  if (productWords.length === 0) return 0;

  let matchedCount = 0;
  for (const pw of productWords) {
    for (const vw of videoWords) {
      if (pw === vw || pw.includes(vw) || vw.includes(pw)) {
        matchedCount++;
        break;
      }
    }
  }

  return matchedCount / productWords.length;
}

function findBestProductMatch(video: Video, products: Product[], threshold = 0.5): Product | null {
  const searchText = video.title || video.product_name || '';
  if (!searchText) return null;

  let bestMatch: { product: Product; score: number } | null = null;

  for (const product of products) {
    const score = calculateMatchScore(searchText, product.producto_nombre);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
    }
  }

  return bestMatch?.product || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get batch parameters from request body
    let batchSize = 50; // Default batch size
    let offset = 0;
    
    try {
      const body = await req.json();
      batchSize = body.batchSize || 50;
      offset = body.offset || 0;
    } catch {
      // Use defaults if no body
    }

    console.log(`🔄 Starting batch matching: offset=${offset}, batchSize=${batchSize}`);

    // Fetch all products once (they're usually fewer)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, categoria, total_ingresos_mxn, total_ventas, commission, price')
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

    console.log(`📦 Found ${products.length} products`);

    // Fetch videos in batch (only unmatched or all based on offset)
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, product_name, product_id')
      .is('product_id', null) // Only unmatched videos
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
          message: 'No more videos to match', 
          matched: 0, 
          complete: true,
          totalUnmatched: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Processing ${videos.length} videos (batch)...`);

    let matchedCount = 0;

    // Process each video in batch
    for (const video of videos) {
      const bestMatch = findBestProductMatch(video, products);

      if (bestMatch) {
        matchedCount++;
        const { error: updateError } = await supabase
          .from('videos')
          .update({
            product_id: bestMatch.id,
            product_name: bestMatch.producto_nombre,
            product_price: bestMatch.price,
            product_revenue: bestMatch.total_ingresos_mxn,
            product_sales: bestMatch.total_ventas,
          })
          .eq('id', video.id);
        
        if (updateError) {
          console.error(`Error updating video ${video.id}:`, updateError.message);
        }
      }
    }

    const remainingUnmatched = (totalUnmatched || 0) - matchedCount;
    const complete = videos.length < batchSize;

    console.log(`✅ Batch complete: ${matchedCount}/${videos.length} matched, ${remainingUnmatched} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        batchProcessed: videos.length,
        matchedInBatch: matchedCount,
        remainingUnmatched: Math.max(0, remainingUnmatched),
        complete,
        nextOffset: complete ? null : offset + batchSize,
        message: complete 
          ? `Matching complete! ${matchedCount} matched in final batch`
          : `Batch processed: ${matchedCount} matched, ${remainingUnmatched} remaining`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in auto-match-videos-products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
