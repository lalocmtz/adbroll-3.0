// =============================================================================
// match-videos: matching video <-> producto de 4 capas.
// Reemplaza conceptualmente a auto-match-videos-products / smart-match-products
// (que se mantienen hasta retirarse).
//
//   Capa 0 (exact):  alias confirmado (product_aliases) o igualdad exacta de
//                    nombre_normalizado en el mismo mercado.
//   Capa 1 (fuzzy):  pg_trgm vía RPC find_similar_products; score >= 0.85.
//   Capa 2 (ai):     Lovable AI (google/gemini-2.5-flash) elige entre los 10
//                    candidatos trigram. confidence >= 0.9 -> match 'ai';
//                    0.6-0.9 -> 'review' (suggested_product_id + match_reason);
//                    < 0.6 -> 'none'.
//
// Entrada:  { market?: string = "mx", limit?: number = 50 }
// Salida:   { processed, exact, fuzzy, ai, review, none }
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Réplica EXACTA de public.normalize_title() de la migración
// 20260611100000_data_backbone.sql. Si cambias una, cambia la otra.
// ---------------------------------------------------------------------------
const ACCENTS_FROM = "áàâäãéèêëíìîïóòôöõúùûüñç";
const ACCENTS_TO = "aaaaaeeeeiiiiooooouuuunc";

function normalizeTitle(input: string | null | undefined): string {
  if (!input) return "";
  let s = input.toLowerCase();
  // Segmentos entre corchetes (ruido típico de Kalodata: 【OFERTA】, [2x1], (...))
  s = s.replace(/【[^】]*】|\[[^\]]*\]|\([^)]*\)|（[^）]*）/g, " ");
  // Hashtags completos
  s = s.replace(/#[^\s]+/g, " ");
  // Translitera acentos comunes
  s = s
    .split("")
    .map((ch) => {
      const i = ACCENTS_FROM.indexOf(ch);
      return i >= 0 ? ACCENTS_TO[i] : ch;
    })
    .join("");
  // Elimina todo lo que no sea [a-z0-9 ] (incluye emojis)
  s = s.replace(/[^a-z0-9 ]/g, " ");
  // Colapsa espacios
  return s.replace(/\s+/g, " ").trim();
}

interface Candidate {
  id: string;
  producto_nombre: string;
  score: number;
}

interface AiVerdict {
  product_id: string | null;
  confidence: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Capa 2: Lovable AI. Mismo endpoint/modelo que smart-match-products.
// ---------------------------------------------------------------------------
async function aiPickProduct(
  lovableApiKey: string,
  videoTitle: string | null,
  productName: string,
  candidates: Candidate[],
): Promise<AiVerdict | null> {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. id="${c.id}" nombre="${c.producto_nombre}" score_trgm=${c.score.toFixed(2)}`)
    .join("\n");

  const prompt = `Eres un sistema de matching producto<->video de TikTok Shop.

VIDEO:
- Descripción del video: "${(videoTitle || "").slice(0, 300)}"
- Producto buscado (extraído del video): "${productName.slice(0, 200)}"

CANDIDATOS (productos del catálogo, con score de similitud trigram):
${candidateList}

¿Cuál candidato es EL MISMO producto que promociona el video? Sé estricto:
misma categoría no basta, debe ser el mismo producto (marca/modelo/variante).

Responde SOLO con JSON válido, sin markdown ni texto extra:
{"product_id": "<id exacto del candidato o null>", "confidence": <0 a 1>, "reason": "<breve, máx 120 chars>"}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Eres un experto en matching de productos de TikTok Shop. Respondes únicamente JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error(`Lovable AI error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content || "";
    // Tolera fences ```json ... ```
    content = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) return null;

    const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
    const candidateIds = new Set(candidates.map((c) => c.id));
    const productId =
      typeof parsed.product_id === "string" && candidateIds.has(parsed.product_id)
        ? parsed.product_id
        : null;
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

    return {
      product_id: productId,
      confidence: productId ? confidence : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
    };
  } catch (error) {
    console.error("aiPickProduct error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    // -----------------------------------------------------------------------
    // Autorización: founder (UI admin) o service_role (invocación interna
    // desde otra edge function, p.ej. tras un import).
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace("Bearer ", "").trim();
    let authorized = serviceKey.length > 0 && bearer === serviceKey;

    if (!authorized) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleData } = await userClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "founder")
          .maybeSingle();
        authorized = !!roleData;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Acceso denegado: solo founder o service role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { market?: string; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // body vacío -> defaults
    }
    const market = body.market || "mx";
    const limit = Math.max(1, Math.min(Number(body.limit) || 50, 200));

    console.log(`match-videos: market=${market} limit=${limit}`);

    // -----------------------------------------------------------------------
    // Videos pendientes: sin producto, no descartados ('none'), con nombre o
    // con tiktok_product_id. Nunca se toca un match manual.
    // -----------------------------------------------------------------------
    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select("id, title, product_name, country, tiktok_product_id, source_product_url, manual_match")
      .eq("country", market)
      .is("product_id", null)
      .or("manual_match.is.null,manual_match.eq.false")
      .or("match_source.is.null,match_source.neq.none")
      .order("rank", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (videosError) throw new Error(`videos query: ${videosError.message}`);

    const summary = { processed: 0, by_id: 0, outside_catalog: 0, exact: 0, fuzzy: 0, ai: 0, review: 0, none: 0 };

    if (!videos?.length) {
      return new Response(
        JSON.stringify({ success: true, market, ...summary, message: "Sin videos pendientes" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -----------------------------------------------------------------------
    // Helper: escribe el resultado en videos + audita el intento.
    // -----------------------------------------------------------------------
    const applyMatch = async (
      video: { id: string; tiktok_product_id: string | null; source_product_url: string | null },
      fields: Record<string, unknown>,
      audit: { product_id?: string | null; match_status: string; match_method: string; confidence?: number | null; reason?: string | null },
    ) => {
      await supabase
        .from("videos")
        .update({
          ...fields,
          match_status: audit.match_status,
          match_method: audit.match_method,
          match_confidence: audit.confidence ?? null,
          match_algorithm_version: ALGO_VERSION,
        })
        .eq("id", video.id);

      const { error: auditError } = await supabase.from("video_match_audit").insert({
        video_id: video.id,
        product_id: audit.product_id ?? null,
        market,
        match_status: audit.match_status,
        match_method: audit.match_method,
        match_confidence: audit.confidence ?? null,
        match_algorithm_version: ALGO_VERSION,
        tiktok_product_id: video.tiktok_product_id ?? null,
        source_product_url: video.source_product_url ?? null,
        reason: audit.reason ?? null,
      });
      if (auditError) console.error("video_match_audit insert:", auditError.message);
    };

    // -----------------------------------------------------------------------
    // Precarga para capa 0: aliases del mercado + catálogo normalizado + IDs.
    // -----------------------------------------------------------------------
    const { data: aliases } = await supabase
      .from("product_aliases")
      .select("alias_normalized, product_id, market")
      .or(`market.eq.${market},market.is.null`);

    const aliasMap = new Map<string, string>();
    for (const a of aliases ?? []) {
      // Prioriza alias con mercado explícito sobre alias globales.
      if (a.market === market || !aliasMap.has(a.alias_normalized)) {
        aliasMap.set(a.alias_normalized, a.product_id);
      }
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, producto_nombre, nombre_normalizado, tiktok_product_id")
      .eq("market", market);

    const byNormalized = new Map<string, string[]>();
    const byTikTokProductId = new Map<string, string>();
    for (const p of products ?? []) {
      if (p.tiktok_product_id && !byTikTokProductId.has(p.tiktok_product_id)) {
        byTikTokProductId.set(p.tiktok_product_id, p.id);
      }
      if (!p.nombre_normalizado) continue;
      const list = byNormalized.get(p.nombre_normalizado) ?? [];
      list.push(p.id);
      byNormalized.set(p.nombre_normalizado, list);
    }

    // -----------------------------------------------------------------------
    // Loop principal por video.
    // -----------------------------------------------------------------------
    for (const video of videos) {
      summary.processed++;
      const normalized = normalizeTitle(video.product_name);

      // Sin texto útil -> none.
      if (!normalized) {
        await supabase
          .from("videos")
          .update({ match_source: "none", suggested_product_id: null, match_reason: "titulo vacio tras normalizar" })
          .eq("id", video.id);
        summary.none++;
        continue;
      }

      // ---- Capa 0a: alias confirmado ----
      let exactProductId: string | null = aliasMap.get(normalized) ?? null;

      // ---- Capa 0b: igualdad exacta de nombre_normalizado (1 solo producto) ----
      if (!exactProductId) {
        const sameName = byNormalized.get(normalized);
        if (sameName && sameName.length === 1) {
          exactProductId = sameName[0];
        }
      }

      if (exactProductId) {
        await supabase
          .from("videos")
          .update({
            product_id: exactProductId,
            match_source: "exact",
            ai_match_confidence: null,
            suggested_product_id: null,
            match_reason: null,
          })
          .eq("id", video.id);
        summary.exact++;
        continue;
      }

      // ---- Capa 1: fuzzy pg_trgm vía RPC ----
      const { data: candidates, error: rpcError } = await supabase.rpc("find_similar_products", {
        _title: video.product_name,
        _market: market,
        _limit: 10,
      });

      if (rpcError) {
        console.error(`find_similar_products error (video ${video.id}):`, rpcError.message);
        continue; // no marques nada; reintentable en el próximo batch
      }

      const cands: Candidate[] = (candidates ?? []).filter((c: Candidate) => c.score != null);
      const top = cands[0];

      if (top && top.score >= 0.85) {
        await supabase
          .from("videos")
          .update({
            product_id: top.id,
            match_source: "fuzzy",
            ai_match_confidence: top.score,
            suggested_product_id: null,
            match_reason: null,
          })
          .eq("id", video.id);
        summary.fuzzy++;
        continue;
      }

      // ---- Capa 2: IA con los candidatos trigram ----
      if (!cands.length) {
        await supabase
          .from("videos")
          .update({ match_source: "none", suggested_product_id: null, match_reason: "sin candidatos trigram" })
          .eq("id", video.id);
        summary.none++;
        continue;
      }

      let verdict: AiVerdict | null = null;
      if (lovableApiKey) {
        verdict = await aiPickProduct(lovableApiKey, video.title, video.product_name, cands);
      }

      if (!verdict) {
        // Sin IA disponible: deja en revisión si el trigram al menos sugiere algo.
        if (top && top.score >= 0.6) {
          await supabase
            .from("videos")
            .update({
              match_source: "review",
              suggested_product_id: top.id,
              match_reason: `fallback trigram score=${top.score.toFixed(2)} (IA no disponible)`,
              ai_match_attempted_at: new Date().toISOString(),
            })
            .eq("id", video.id);
          summary.review++;
        } else {
          await supabase
            .from("videos")
            .update({
              match_source: "none",
              suggested_product_id: null,
              match_reason: null,
              ai_match_attempted_at: new Date().toISOString(),
            })
            .eq("id", video.id);
          summary.none++;
        }
        continue;
      }

      if (verdict.product_id && verdict.confidence >= 0.9) {
        await supabase
          .from("videos")
          .update({
            product_id: verdict.product_id,
            match_source: "ai",
            ai_match_confidence: verdict.confidence,
            suggested_product_id: null,
            match_reason: verdict.reason || null,
            ai_match_attempted_at: new Date().toISOString(),
          })
          .eq("id", video.id);
        summary.ai++;
      } else if (verdict.product_id && verdict.confidence >= 0.6) {
        await supabase
          .from("videos")
          .update({
            match_source: "review",
            suggested_product_id: verdict.product_id,
            match_reason: verdict.reason || `confianza IA ${verdict.confidence.toFixed(2)}`,
            ai_match_attempted_at: new Date().toISOString(),
          })
          .eq("id", video.id);
        summary.review++;
      } else {
        await supabase
          .from("videos")
          .update({
            match_source: "none",
            suggested_product_id: null,
            match_reason: verdict.reason || null,
            ai_match_attempted_at: new Date().toISOString(),
          })
          .eq("id", video.id);
        summary.none++;
      }
    }

    console.log("match-videos summary:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, market, ...summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Error en match-videos:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
