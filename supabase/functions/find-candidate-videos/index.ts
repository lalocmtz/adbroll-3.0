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

// Generic words that shouldn't be used alone for matching
const GENERIC_WORDS = new Set([
  'aceite', 'crema', 'set', 'pack', 'kit', 'gel', 'spray', 'para', 'con', 'del',
  'mini', 'pro', 'plus', 'max', 'super', 'ultra', 'premium', 'original',
  'grande', 'pequeño', 'nuevo', 'mejor', 'natural', 'organico',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { productId, productName, market, limit = 50 } = await req.json();

    if (!productId || !productName) {
      return new Response(
        JSON.stringify({ error: 'productId and productName required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalized = normalizeText(productName);
    // Extract meaningful keywords (>3 chars, not generic)
    const keywords = normalized
      .split(' ')
      .filter(w => w.length > 3 && !GENERIC_WORDS.has(w));

    if (keywords.length === 0) {
      return new Response(
        JSON.stringify({ candidates: [], message: 'No meaningful keywords found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build OR conditions for text search
    const orConditions = keywords.map(kw => 
      `title.ilike.%${kw}%,product_name.ilike.%${kw}%,transcript.ilike.%${kw}%`
    ).join(',');

    // Fetch videos that mention the product keywords but are NOT linked to this product
    let query = supabase
      .from('videos')
      .select('id, title, video_url, video_mp4_url, thumbnail_url, creator_handle, creator_name, product_name, product_id, sales, revenue_mxn, views, transcript, processing_status, country')
      .or(orConditions)
      .neq('product_id', productId)
      .order('revenue_mxn', { ascending: false, nullsFirst: false })
      .limit(limit);

    // MARKET ISOLATION: Only show videos from the same market
    if (market) {
      query = query.eq('country', market);
    }

    const { data: candidates, error } = await query;

    if (error) throw error;

    // Score each candidate by keyword matches
    const scored = (candidates || []).map(video => {
      const videoText = [
        normalizeText(video.title),
        normalizeText(video.product_name),
        normalizeText(video.transcript?.slice(0, 500))
      ].join(' ');

      let matchCount = 0;
      const matchedKeywords: string[] = [];
      for (const kw of keywords) {
        if (videoText.includes(kw)) {
          matchCount++;
          matchedKeywords.push(kw);
        }
      }

      const score = keywords.length > 0 ? matchCount / keywords.length : 0;
      return { ...video, candidateScore: score, matchedKeywords };
    })
    .filter(v => v.candidateScore > 0)
    .sort((a, b) => {
      // Sort by: unlinked first, then by score, then by revenue
      const aUnlinked = !a.product_id ? 1 : 0;
      const bUnlinked = !b.product_id ? 1 : 0;
      if (aUnlinked !== bUnlinked) return bUnlinked - aUnlinked;
      if (b.candidateScore !== a.candidateScore) return b.candidateScore - a.candidateScore;
      return (b.revenue_mxn || 0) - (a.revenue_mxn || 0);
    });

    return new Response(
      JSON.stringify({ candidates: scored, total: scored.length, keywords }),
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
