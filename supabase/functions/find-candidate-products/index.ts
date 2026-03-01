import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const GENERIC_WORDS = new Set([
  'aceite', 'crema', 'set', 'pack', 'kit', 'gel', 'spray', 'para', 'con', 'del',
  'mini', 'pro', 'plus', 'max', 'super', 'ultra', 'premium', 'original',
  'grande', 'pequeno', 'nuevo', 'mejor', 'natural', 'organico', 'piezas',
  'agua', 'caja', 'bolsa', 'sobre', 'polvo', 'liquido', 'capsulas',
  'este', 'esta', 'esto', 'como', 'pero', 'porque', 'cuando', 'donde',
  'tiene', 'hacer', 'puede', 'solo', 'muy', 'bien', 'aqui', 'todo',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { videoId, market, limit = 10 } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'videoId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the video
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, product_name, transcript, country')
      .eq('id', videoId)
      .maybeSingle();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine market from video country or explicit param
    const effectiveMarket = market || video.country || 'mx';

    // Build searchable text from video
    const videoText = [
      normalizeText(video.title),
      normalizeText(video.product_name),
      normalizeText(video.transcript?.slice(0, 1000)),
    ].join(' ');

    // Extract meaningful keywords
    const allWords = videoText.split(' ').filter(w => w.length > 3 && !GENERIC_WORDS.has(w));
    // Deduplicate
    const keywords = [...new Set(allWords)];

    if (keywords.length === 0) {
      return new Response(
        JSON.stringify({ candidates: [], message: 'No meaningful keywords found in video', keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch products from the SAME market
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, producto_nombre, imagen_url, total_ingresos_mxn, total_ventas, market, categoria')
      .eq('market', effectiveMarket)
      .order('total_ingresos_mxn', { ascending: false, nullsFirst: false })
      .limit(500);

    if (prodError) throw prodError;

    // Score each product by keyword overlap with video text
    const scored = (products || []).map(product => {
      const productText = normalizeText(product.producto_nombre);
      const productWords = productText.split(' ').filter(w => w.length > 3 && !GENERIC_WORDS.has(w));

      let matchCount = 0;
      const matchedKeywords: string[] = [];

      // Check how many video keywords appear in product name
      for (const kw of keywords) {
        if (productText.includes(kw)) {
          matchCount++;
          matchedKeywords.push(kw);
        }
      }

      // Also check if product keywords appear in video text
      for (const pw of productWords) {
        if (videoText.includes(pw) && !matchedKeywords.includes(pw)) {
          matchCount++;
          matchedKeywords.push(pw);
        }
      }

      // Score: ratio of matched keywords to total unique keywords considered
      const totalKeywords = new Set([...keywords, ...productWords]).size;
      const score = totalKeywords > 0 ? matchCount / Math.max(3, totalKeywords) : 0;

      // Boost if product name appears as substring in video text
      let boost = 0;
      if (productText.length > 5 && videoText.includes(productText)) {
        boost = 0.3;
      }

      const finalScore = Math.min(1, score + boost);

      return {
        id: product.id,
        producto_nombre: product.producto_nombre,
        imagen_url: product.imagen_url,
        total_ingresos_mxn: product.total_ingresos_mxn,
        total_ventas: product.total_ventas,
        market: product.market,
        categoria: product.categoria,
        candidateScore: finalScore,
        matchedKeywords: [...new Set(matchedKeywords)],
      };
    })
    .filter(p => p.candidateScore > 0.05 && p.matchedKeywords.length > 0)
    .sort((a, b) => b.candidateScore - a.candidateScore)
    .slice(0, limit);

    return new Response(
      JSON.stringify({
        candidates: scored,
        total: scored.length,
        videoKeywords: keywords.slice(0, 20),
        market: effectiveMarket,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
