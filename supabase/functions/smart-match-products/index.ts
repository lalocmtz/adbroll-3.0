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
  price: number | null;
}

interface Video {
  id: string;
  title: string | null;
  product_name: string | null;
  product_id: string | null;
  video_url: string;
}

// Advanced fuzzy matching with multiple strategies
function calculateMatchScore(videoText: string, productName: string): number {
  if (!videoText || !productName) return 0;

  const v = videoText.toLowerCase().trim();
  const p = productName.toLowerCase().trim();

  // Exact match
  if (v === p) return 1.0;

  // Extract key product words (remove common words, numbers, sizes)
  const stopWords = ['de', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'con', 'y', 'o', 'en', 'a', 'del', 'al', 'por', 'que', 'se', 'es', 'su', 'más', 'como', 'pero', 'sus', 'le', 'ya', 'este', 'esta', 'estos', 'estas', 'tipo', 'precio', 'descuento', 'oferta', 'gratis', 'envio', 'envío'];
  
  const extractKeywords = (text: string): string[] => {
    return text
      .replace(/[^\w\sáéíóúñü]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word) && !/^\d+$/.test(word));
  };

  const productKeywords = extractKeywords(p);
  const videoKeywords = extractKeywords(v);

  if (productKeywords.length === 0) return 0;

  // Strategy 1: Word match ratio
  let matchedWords = 0;
  for (const pWord of productKeywords) {
    for (const vWord of videoKeywords) {
      // Exact word match
      if (pWord === vWord) {
        matchedWords++;
        break;
      }
      // Partial word match (word contains other word, min 4 chars)
      if (pWord.length >= 4 && vWord.length >= 4) {
        if (pWord.includes(vWord) || vWord.includes(pWord)) {
          matchedWords += 0.7;
          break;
        }
      }
      // Levenshtein similarity for typos
      const lev = levenshteinSimilarity(pWord, vWord);
      if (lev >= 0.8) {
        matchedWords += lev;
        break;
      }
    }
  }
  const wordMatchRatio = matchedWords / productKeywords.length;

  // Strategy 2: Substring containment
  let substringScore = 0;
  if (v.includes(p) || p.includes(v)) {
    substringScore = 0.9;
  } else {
    // Check if significant portion of product name is in video
    const mainProductWords = productKeywords.slice(0, 3).join(' ');
    if (mainProductWords.length > 5 && v.includes(mainProductWords)) {
      substringScore = 0.75;
    }
  }

  // Strategy 3: Brand name detection (first word often is brand)
  let brandScore = 0;
  if (productKeywords.length > 0) {
    const brandWord = productKeywords[0];
    if (brandWord.length >= 4) {
      for (const vWord of videoKeywords) {
        if (vWord === brandWord || levenshteinSimilarity(vWord, brandWord) >= 0.85) {
          brandScore = 0.5;
          break;
        }
      }
    }
  }

  // Combine scores with weights
  const finalScore = Math.max(
    wordMatchRatio * 0.8 + brandScore * 0.2,
    substringScore
  );

  return Math.min(finalScore, 1.0);
}

function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2[i - 1] === s1[j - 1]) {
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

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s2.length][s1.length] / maxLen;
}

// AI-enhanced matching using Lovable AI
async function aiMatchProducts(
  videos: Video[],
  products: Product[],
  lovableApiKey: string
): Promise<Map<string, string>> {
  const matches = new Map<string, string>();
  
  // Create product index for AI context
  const productList = products.map((p, idx) => 
    `${idx + 1}. "${p.producto_nombre}" (ID: ${p.id})`
  ).join('\n');

  // Process videos in batches
  const batchSize = 20;
  const unmatchedVideos = videos.filter(v => !v.product_id && v.title);

  console.log(`Processing ${unmatchedVideos.length} unmatched videos with AI...`);

  for (let i = 0; i < unmatchedVideos.length; i += batchSize) {
    const batch = unmatchedVideos.slice(i, i + batchSize);
    
    const videoDescriptions = batch.map((v, idx) => 
      `Video ${i + idx + 1}: "${v.title}"`
    ).join('\n');

    const prompt = `Eres un sistema de matching de productos para TikTok Shop. 

PRODUCTOS DISPONIBLES:
${productList}

VIDEOS A ANALIZAR:
${videoDescriptions}

Para cada video, identifica si menciona algún producto de la lista. Responde SOLO con el formato:
Video X: [número del producto] o "ninguno"

Ejemplo:
Video 1: 3
Video 2: ninguno
Video 3: 1

Busca coincidencias por:
- Nombre del producto o marca
- Características clave del producto
- Palabras relacionadas al tipo de producto

Responde:`;

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Eres un experto en matching de productos de TikTok Shop. Solo responde en el formato especificado.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        console.error(`AI API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';

      // Parse AI response
      const lines = aiResponse.split('\n');
      for (const line of lines) {
        const match = line.match(/Video\s*(\d+):\s*(\d+|ninguno)/i);
        if (match) {
          const videoIdx = parseInt(match[1]) - i - 1;
          const productNum = match[2].toLowerCase();
          
          if (videoIdx >= 0 && videoIdx < batch.length && productNum !== 'ninguno') {
            const productIdx = parseInt(productNum) - 1;
            if (productIdx >= 0 && productIdx < products.length) {
              matches.set(batch[videoIdx].id, products[productIdx].id);
              console.log(`AI matched: "${batch[videoIdx].title?.substring(0, 40)}" → "${products[productIdx].producto_nombre.substring(0, 40)}"`);
            }
          }
        }
      }

      // Rate limit between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('AI matching error:', error);
    }
  }

  return matches;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting smart product matching...');

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, categoria, total_ingresos_mxn, price')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });

    if (productsError) throw new Error(`Products error: ${productsError.message}`);
    if (!products?.length) {
      return new Response(
        JSON.stringify({ message: 'No products found', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${products.length} products`);

    // Fetch all videos
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, product_name, product_id, video_url');

    if (videosError) throw new Error(`Videos error: ${videosError.message}`);
    if (!videos?.length) {
      return new Response(
        JSON.stringify({ message: 'No videos found', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎬 Found ${videos.length} videos`);

    let matchedCount = 0;
    let updatedCount = 0;
    const matchResults: { videoId: string; productId: string; score: number }[] = [];

    // PHASE 1: Fuzzy matching algorithm
    console.log('📊 Phase 1: Fuzzy matching...');
    for (const video of videos) {
      const searchText = video.title || video.product_name || '';
      if (!searchText) continue;

      let bestMatch: { product: Product; score: number } | null = null;

      for (const product of products) {
        const score = calculateMatchScore(searchText, product.producto_nombre);
        
        if (score >= 0.55) { // Threshold
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { product, score };
          }
        }
      }

      if (bestMatch && bestMatch.score >= 0.55) {
        matchResults.push({
          videoId: video.id,
          productId: bestMatch.product.id,
          score: bestMatch.score
        });
        matchedCount++;
      }
    }

    console.log(`✓ Phase 1 complete: ${matchedCount} matches found`);

    // PHASE 2: AI matching for unmatched videos (if API key available)
    const matchedVideoIds = new Set(matchResults.map(m => m.videoId));
    const unmatchedVideos = videos.filter(v => !matchedVideoIds.has(v.id) && v.title);

    if (lovableApiKey && unmatchedVideos.length > 0 && unmatchedVideos.length <= 100) {
      console.log(`🤖 Phase 2: AI matching ${unmatchedVideos.length} videos...`);
      
      const aiMatches = await aiMatchProducts(unmatchedVideos, products, lovableApiKey);
      
      for (const [videoId, productId] of aiMatches) {
        matchResults.push({ videoId, productId, score: 0.6 });
        matchedCount++;
      }
      
      console.log(`✓ Phase 2 complete: ${aiMatches.size} AI matches`);
    }

    // Update database
    console.log('💾 Updating database...');
    for (const match of matchResults) {
      const video = videos.find(v => v.id === match.videoId);
      
      // Skip if already correctly matched
      if (video?.product_id === match.productId) continue;

      const product = products.find(p => p.id === match.productId);
      
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          product_id: match.productId,
          product_name: product?.producto_nombre || null,
          product_price: product?.price || null,
          product_revenue: product?.total_ingresos_mxn || null,
        })
        .eq('id', match.videoId);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`Update error for ${match.videoId}:`, updateError.message);
      }
    }

    console.log(`✅ Matching complete: ${matchedCount} matched, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        totalVideos: videos.length,
        totalProducts: products.length,
        matchedCount,
        updatedCount,
        unmatchedRemaining: videos.length - matchedCount,
        message: `Smart matching: ${matchedCount} videos matched, ${updatedCount} updated`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in smart-match-products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
