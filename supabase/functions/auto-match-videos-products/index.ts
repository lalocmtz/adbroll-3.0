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
}

interface Video {
  id: string;
  descripcion_video: string;
  producto_nombre: string | null;
  product_id: string | null;
}

// Fuzzy matching using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Simple substring match bonus
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length][s1.length];
  
  return 1 - (distance / maxLength);
}

function findBestProductMatch(
  video: Video,
  products: Product[],
  threshold: number = 0.70
): Product | null {
  if (!video.descripcion_video) return null;
  
  const candidates: Array<{ product: Product; score: number }> = [];
  
  for (const product of products) {
    let score = 0;
    let maxScore = 0;
    
    // Match against product name
    const nameScore = calculateSimilarity(
      video.descripcion_video,
      product.producto_nombre
    );
    score += nameScore * 2; // Weight product name heavily
    maxScore += 2;
    
    // Match against existing producto_nombre field if available
    if (video.producto_nombre) {
      const existingNameScore = calculateSimilarity(
        video.producto_nombre,
        product.producto_nombre
      );
      score += existingNameScore * 1.5;
      maxScore += 1.5;
    }
    
    // Normalize score
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;
    
    if (normalizedScore >= threshold) {
      candidates.push({ product, score: normalizedScore });
    }
  }
  
  if (candidates.length === 0) return null;
  
  // Sort by score first
  candidates.sort((a, b) => b.score - a.score);
  
  // If top candidates have similar scores, prefer by revenue/sales
  const topScore = candidates[0].score;
  const topCandidates = candidates.filter(c => 
    Math.abs(c.score - topScore) < 0.05
  );
  
  if (topCandidates.length > 1) {
    topCandidates.sort((a, b) => {
      const aRevenue = a.product.total_ingresos_mxn || 0;
      const bRevenue = b.product.total_ingresos_mxn || 0;
      if (aRevenue !== bRevenue) return bRevenue - aRevenue;
      
      const aSales = a.product.total_ventas || 0;
      const bSales = b.product.total_ventas || 0;
      return bSales - aSales;
    });
  }
  
  return topCandidates[0].product;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting auto-matching videos to products...');

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, categoria, total_ingresos_mxn, total_ventas, commission');

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No products found to match',
          matched: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${products.length} products`);

    // Fetch all videos that need matching (no product_id or outdated)
    const { data: videos, error: videosError } = await supabase
      .from('daily_feed')
      .select('id, descripcion_video, producto_nombre, product_id');

    if (videosError) {
      throw new Error(`Error fetching videos: ${videosError.message}`);
    }

    if (!videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No videos found to match',
          matched: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${videos.length} videos for matching...`);

    let matchedCount = 0;
    let updatedCount = 0;

    // Process each video
    for (const video of videos) {
      const bestMatch = findBestProductMatch(video, products);
      
      if (bestMatch) {
        matchedCount++;
        
        // Only update if product_id is different
        if (video.product_id !== bestMatch.id) {
          const { error: updateError } = await supabase
            .from('daily_feed')
            .update({ 
              product_id: bestMatch.id,
              producto_nombre: bestMatch.producto_nombre,
              producto_url: null // Reset producto_url to use the one from products table
            })
            .eq('id', video.id);

          if (updateError) {
            console.error(`Error updating video ${video.id}:`, updateError.message);
          } else {
            updatedCount++;
            console.log(`Matched video "${video.descripcion_video?.substring(0, 50)}" to product "${bestMatch.producto_nombre}"`);
          }
        }
      }
    }

    console.log(`Matching complete: ${matchedCount} matches found, ${updatedCount} videos updated`);

    return new Response(
      JSON.stringify({ 
        success: true,
        totalVideos: videos.length,
        totalProducts: products.length,
        matchedCount,
        updatedCount,
        message: `Successfully matched ${matchedCount} videos to products (${updatedCount} updated)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in auto-match-videos-products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
