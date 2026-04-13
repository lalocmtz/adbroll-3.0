// auto-match-videos-products — DEPRECATED as of Phase 1 (2026-04-12).
//
// Historical purpose: walk every video in `daily_feed` after a Kalodata
// import and guess which product it referred to using Levenshtein-based
// fuzzy matching. The algorithm produced both false positives (wrong
// product attached to a video) and silent false negatives (matched
// product disappeared on the next import), and it duplicated work that the
// new deterministic ingestion already does at insert time.
//
// In Phase 1 we replaced it with deterministic natural-key matching inside
// `process-kalodata`. Matching now happens exactly once, when the row is
// first written, using `tiktok_product_id` / `producto_url` / normalized
// `producto_nombre` as keys. Missing products are auto-created as stubs
// (`from_video=true`) so no video is ever orphaned.
//
// This stub is kept so existing callers that invoke the function (and the
// Admin panel trigger from the old products importer) get a clean 200
// response instead of an ambiguous failure. It performs zero matching.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = {
    success: true,
    deprecated: true,
    since: "2026-04-12",
    replaced_by: "process-kalodata (deterministic matching)",
    matched: 0,
    message:
      "auto-match-videos-products is deprecated. Matching is now performed deterministically at ingestion time by process-kalodata. This endpoint is a no-op kept for backwards compatibility.",
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
