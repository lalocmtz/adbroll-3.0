import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Text normalization
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein similarity
function levenshteinSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
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
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 1 : 1 - dp[m][n] / maxLen;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Admin-only authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Check if user has founder role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log('🔄 Starting rebuild_index process...');

    // STEP 1: Recalculate product derived metrics
    console.log('📦 Step 1: Recalculating product metrics...');
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, producto_nombre, price, commission, total_ingresos_mxn, total_ventas, creators_count, revenue_30d');

    if (productsError) throw new Error(`Products fetch error: ${productsError.message}`);

    let productsUpdated = 0;
    for (const product of products || []) {
      // Calculate earning_per_sale = price * commission_rate
      const earningPerSale = product.price && product.commission
        ? product.price * (product.commission / 100)
        : null;

      // Ensure gmv_30d and sales_30d are populated
      const gmv30d = product.total_ingresos_mxn || product.revenue_30d || 0;
      const sales30d = product.total_ventas || 0;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          commission_amount: earningPerSale,
          gmv_30d_mxn: gmv30d,
          total_ingresos_mxn: gmv30d,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (!updateError) productsUpdated++;
    }

    console.log(`✓ Updated ${productsUpdated} products with derived metrics`);

    // STEP 2: Clear all product matches to rebuild
    console.log('🔗 Step 2: Clearing video-product matches for rebuild...');
    
    const { error: clearError } = await supabase
      .from('videos')
      .update({
        product_id: null,
        ai_match_confidence: null,
        ai_match_attempted_at: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (clearError) {
      console.warn('Warning clearing matches:', clearError.message);
    }

    // STEP 3: Rebuild creator links
    console.log('👤 Step 3: Rebuilding creator links...');
    
    const { data: creators, error: creatorsError } = await supabase
      .from('creators')
      .select('id, creator_handle');

    if (creatorsError) throw new Error(`Creators fetch error: ${creatorsError.message}`);

    let creatorsLinked = 0;
    for (const creator of creators || []) {
      if (!creator.creator_handle) continue;
      
      const normalizedHandle = normalizeText(creator.creator_handle);
      
      const { data: matchedVideos, error: matchError } = await supabase
        .from('videos')
        .select('id')
        .or(`creator_handle.ilike.%${normalizedHandle}%,creator_name.ilike.%${normalizedHandle}%`)
        .is('creator_id', null);

      if (!matchError && matchedVideos && matchedVideos.length > 0) {
        for (const video of matchedVideos) {
          await supabase
            .from('videos')
            .update({ creator_id: creator.id })
            .eq('id', video.id);
          creatorsLinked++;
        }
      }
    }

    console.log(`✓ Linked ${creatorsLinked} videos to creators`);

    // STEP 4: Re-run product matching with Auto-Matcher V2
    console.log('🎯 Step 4: Running Auto-Matcher V2...');
    
    // Refresh products with updated data
    const { data: updatedProducts } = await supabase
      .from('products')
      .select('id, producto_nombre, producto_url, categoria, price, commission, total_ingresos_mxn, total_ventas')
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false });

    // Get ALL videos (no limit)
    const { data: allVideos, error: videosError, count: totalVideos } = await supabase
      .from('videos')
      .select('id, title, video_url, product_name, category', { count: 'exact' });

    if (videosError) throw new Error(`Videos fetch error: ${videosError.message}`);

    console.log(`📹 Processing ${allVideos?.length || 0} total videos...`);

    let matchedCount = 0;
    let noMatchCount = 0;
    const threshold = 0.55;

    for (const video of allVideos || []) {
      let bestMatch: { product: any; score: number } | null = null;
      
      for (const product of updatedProducts || []) {
        const videoTitle = normalizeText(video.title);
        const videoProductName = normalizeText(video.product_name);
        const productName = normalizeText(product.producto_nombre);
        
        let score = 0;
        
        // Exact match on product_name
        if (videoProductName && productName && videoProductName === productName) {
          score = 1.0;
        } else if (videoProductName && productName) {
          // Containment
          if (videoProductName.includes(productName) || productName.includes(videoProductName)) {
            score = Math.max(score, 0.9);
          }
          // String similarity
          score = Math.max(score, levenshteinSimilarity(videoProductName, productName) * 0.85);
        }
        
        // Title matching
        if (videoTitle && productName) {
          if (videoTitle.includes(productName)) {
            score = Math.max(score, 0.8);
          }
          const titleWords = videoTitle.split(' ').filter(w => w.length > 2);
          const productWords = productName.split(' ').filter(w => w.length > 2);
          
          if (productWords.length > 0) {
            let matched = 0;
            for (const pw of productWords) {
              for (const tw of titleWords) {
                if (pw === tw || (pw.length >= 4 && tw.length >= 4 && (pw.includes(tw) || tw.includes(pw)))) {
                  matched++;
                  break;
                }
              }
            }
            score = Math.max(score, (matched / productWords.length) * 0.7);
          }
        }
        
        if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { product, score };
        }
      }
      
      if (bestMatch) {
        matchedCount++;
        await supabase
          .from('videos')
          .update({
            product_id: bestMatch.product.id,
            product_name: bestMatch.product.producto_nombre,
            product_price: bestMatch.product.price,
            product_revenue: bestMatch.product.total_ingresos_mxn,
            product_sales: bestMatch.product.total_ventas,
            ai_match_confidence: bestMatch.score,
            ai_match_attempted_at: new Date().toISOString(),
          })
          .eq('id', video.id);
      } else {
        noMatchCount++;
        await supabase
          .from('videos')
          .update({
            ai_match_attempted_at: new Date().toISOString(),
            ai_match_confidence: 0,
          })
          .eq('id', video.id);
      }
    }

    console.log(`✓ Matched ${matchedCount} videos, ${noMatchCount} unmatched (score < ${threshold})`);

    // STEP 5: Update category counts and validate data integrity
    console.log('📊 Step 5: Validating data integrity...');
    
    // Get final stats
    const { count: videosWithProduct } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .not('product_id', 'is', null);

    const { count: videosWithoutProduct } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .is('product_id', null);

    const { count: videosWithCreator } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .not('creator_id', 'is', null);

    console.log('✅ Rebuild complete!');

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          productsUpdated,
          totalVideos: totalVideos || 0,
          videosMatched: matchedCount,
          videosUnmatched: noMatchCount,
          videosWithProduct: videosWithProduct || 0,
          videosWithoutProduct: videosWithoutProduct || 0,
          videosWithCreator: videosWithCreator || 0,
          creatorsLinked,
          threshold,
        },
        message: `Rebuild complete: ${matchedCount} videos matched, ${productsUpdated} products updated, ${creatorsLinked} creator links restored.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in rebuild-index:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
