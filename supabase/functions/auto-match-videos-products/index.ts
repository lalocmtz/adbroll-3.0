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

// Advanced fuzzy matching with multiple strategies
function calculateMatchScore(videoText: string, productName: string): number {
  if (!videoText || !productName) return 0;

  const v = videoText.toLowerCase().trim();
  const p = productName.toLowerCase().trim();

  // Exact match
  if (v === p) return 1.0;

  // Remove emojis and special chars
  const clean = (s: string) => s
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\sáéíóúñü]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const vClean = clean(v);
  const pClean = clean(p);

  // Direct containment (high confidence)
  if (vClean.includes(pClean) || pClean.includes(vClean)) return 0.9;

  // Extract keywords (remove stopwords)
  const stopWords = ['de', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'con', 'y', 'o', 'en', 'a', 'del', 'al', 'por', 'que', 'se', 'es', 'su', 'más', 'como', 'pero'];
  
  const extractWords = (s: string): string[] => 
    s.split(' ').filter(w => w.length > 2 && !stopWords.includes(w) && !/^\d+$/.test(w));

  const productWords = extractWords(pClean);
  const videoWords = extractWords(vClean);

  if (productWords.length === 0) return 0;

  // Word matching with partial matching
  let matchedScore = 0;
  for (const pw of productWords) {
    let bestWordMatch = 0;
    for (const vw of videoWords) {
      // Exact word match
      if (pw === vw) {
        bestWordMatch = 1;
        break;
      }
      // Partial word match (one contains the other)
      if (pw.length >= 4 && vw.length >= 4) {
        if (pw.includes(vw) || vw.includes(pw)) {
          bestWordMatch = Math.max(bestWordMatch, 0.7);
        }
      }
      // Levenshtein similarity for typos
      const lev = levenshteinSimilarity(pw, vw);
      if (lev >= 0.8) {
        bestWordMatch = Math.max(bestWordMatch, lev);
      }
    }
    matchedScore += bestWordMatch;
  }

  return matchedScore / productWords.length;
}

function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      matrix[i][j] = s2[i - 1] === s1[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }

  return 1 - matrix[s2.length][s1.length] / Math.max(s1.length, s2.length);
}

function findBestProductMatch(video: Video, products: Product[], threshold = 0.5): Product | null {
  const searchText = video.title || video.product_name || '';
  if (!searchText) return null;

  let bestMatch: { product: Product; score: number } | null = null;

  for (const product of products) {
    const score = calculateMatchScore(searchText, product.producto_nombre);

    if (score >= threshold) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { product, score };
      }
    }
  }

  // If multiple candidates have similar top scores, prefer by revenue
  if (bestMatch && bestMatch.score < 0.7) {
    const alternatives = products.filter(p => {
      const s = calculateMatchScore(searchText, p.producto_nombre);
      return s >= threshold && Math.abs(s - bestMatch!.score) < 0.1;
    });

    if (alternatives.length > 1) {
      alternatives.sort((a, b) => (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0));
      bestMatch = { product: alternatives[0], score: bestMatch.score };
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

    console.log('🔄 Starting auto-matching videos to products...');

    // Fetch all products ordered by revenue
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, categoria, total_ingresos_mxn, total_ventas, commission, price')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products found to match', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${products.length} products`);

    // Fetch all videos from the videos table
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, product_name, product_id');

    if (videosError) {
      throw new Error(`Error fetching videos: ${videosError.message}`);
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No videos found to match', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Processing ${videos.length} videos for matching...`);

    let matchedCount = 0;
    let updatedCount = 0;
    let alreadyMatchedCount = 0;

    // Process each video
    for (const video of videos) {
      const bestMatch = findBestProductMatch(video, products);

      if (bestMatch) {
        matchedCount++;

        // Only update if product_id is different or null
        if (video.product_id !== bestMatch.id) {
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
          } else {
            updatedCount++;
            console.log(`✓ Matched: "${video.title?.substring(0, 40)}" → "${bestMatch.producto_nombre.substring(0, 40)}"`);
          }
        } else {
          alreadyMatchedCount++;
        }
      }
    }

    console.log(`✅ Matching complete: ${matchedCount} total matches, ${updatedCount} updated, ${alreadyMatchedCount} already matched`);

    return new Response(
      JSON.stringify({
        success: true,
        totalVideos: videos.length,
        totalProducts: products.length,
        matchedCount,
        updatedCount,
        alreadyMatchedCount,
        unmatchedCount: videos.length - matchedCount,
        message: `Matched ${matchedCount} videos to products (${updatedCount} updated)`
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
