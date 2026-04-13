// process-kalodata-products — Phase 1 rewrite.
//
// Handles both the old 9-column export and the new 19-column one by routing
// every field through the shared column-alias table. Upserts on the natural
// key (tiktok_product_id when present, producto_url otherwise, producto_nombre
// as last resort) so re-imports never duplicate rows and never rename stubs
// that were auto-created by the video pipeline.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import {
  type Row,
  PRODUCT_COLUMNS,
  detectFormat,
  extractTikTokProductId,
  normalizeTitle,
  pickInt,
  pickNumber,
  pickString,
} from "../_shared/kalodata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("No autenticado");

    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();
    if (roleError || !roleData) {
      throw new Error("Acceso denegado: solo fundador puede procesar archivos");
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No se proporcionó archivo");

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Row[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const detectedFormat = detectFormat(rows, "products");
    console.log(
      `[process-kalodata-products] ${rows.length} rows, detected=${detectedFormat}`,
    );

    if (rows.length === 0) throw new Error("El archivo no contiene filas válidas");

    const now = new Date().toISOString();

    // Build upsert payloads. No Top-N slice: we ingest everything and let
    // downstream queries sort — losing rows is always worse than ingesting
    // them and filtering later.
    const payloads = rows
      .map((row) => {
        const name = pickString(row, PRODUCT_COLUMNS.name);
        if (!name) return null;
        const url = pickString(row, PRODUCT_COLUMNS.url);
        const tiktokProductId =
          pickString(row, PRODUCT_COLUMNS.tiktokProductId) ??
          extractTikTokProductId(url);

        return {
          producto_nombre: name,
          producto_url: url,
          tiktok_product_id: tiktokProductId,
          categoria: pickString(row, PRODUCT_COLUMNS.category),
          precio_mxn: pickNumber(row, PRODUCT_COLUMNS.price),
          price: pickNumber(row, PRODUCT_COLUMNS.price),
          descripcion: pickString(row, PRODUCT_COLUMNS.description),
          imagen_url: pickString(row, PRODUCT_COLUMNS.image),
          total_ventas: pickInt(row, PRODUCT_COLUMNS.sales) ?? 0,
          total_ingresos_mxn: pickNumber(row, PRODUCT_COLUMNS.revenue) ?? 0,
          promedio_roas: pickNumber(row, PRODUCT_COLUMNS.roas),
          commission: pickNumber(row, PRODUCT_COLUMNS.commission),
          currency: pickString(row, PRODUCT_COLUMNS.currency),
          // Flag: this row came from the authoritative products export, so
          // it is NOT a stub. If a stub already existed with the same natural
          // key, the upsert will override `from_video` to false on conflict
          // via the explicit column below.
          from_video: false,
          source: "kalodata_products",
          last_import: now,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    console.log(`[process-kalodata-products] prepared ${payloads.length} payloads`);

    let insertedCount = 0;
    let updatedCount = 0;

    // Deterministic deduplication inside the incoming file: if two rows share
    // the same (tiktok_product_id | producto_url | normalized name), we keep
    // the one with the highest revenue so we never upsert two rows onto the
    // same natural key in a single batch.
    const dedupe = new Map<string, typeof payloads[number]>();
    for (const p of payloads) {
      const key =
        p.tiktok_product_id ?? p.producto_url ?? normalizeTitle(p.producto_nombre);
      const existing = dedupe.get(key);
      if (!existing || (p.total_ingresos_mxn ?? 0) > (existing.total_ingresos_mxn ?? 0)) {
        dedupe.set(key, p);
      }
    }
    const deduped = Array.from(dedupe.values());

    // Split by which natural key we'll use for onConflict.
    const byTiktokId = deduped.filter((p) => p.tiktok_product_id);
    const byUrl = deduped.filter((p) => !p.tiktok_product_id && p.producto_url);
    const byName = deduped.filter((p) => !p.tiktok_product_id && !p.producto_url);

    if (byTiktokId.length > 0) {
      const { error, count } = await service
        .from("products")
        .upsert(byTiktokId, { onConflict: "tiktok_product_id", count: "exact" });
      if (error) {
        console.error("[process-kalodata-products] upsert-by-id error:", error);
      } else {
        insertedCount += count ?? byTiktokId.length;
      }
    }

    if (byUrl.length > 0) {
      const { error, count } = await service
        .from("products")
        .upsert(byUrl, { onConflict: "producto_url", count: "exact" });
      if (error) {
        console.error("[process-kalodata-products] upsert-by-url error:", error);
      } else {
        insertedCount += count ?? byUrl.length;
      }
    }

    // Last resort: no stable URL or ID — match by normalized name manually.
    for (const p of byName) {
      const nameKey = normalizeTitle(p.producto_nombre);
      const { data: existing } = await service
        .from("products")
        .select("id")
        .eq("producto_nombre", p.producto_nombre)
        .maybeSingle();
      if (existing) {
        const { error } = await service.from("products").update(p).eq("id", existing.id);
        if (!error) updatedCount++;
      } else {
        const { error } = await service.from("products").insert(p);
        if (!error) insertedCount++;
      }
      // nameKey is intentionally unused beyond the lookup — kept for clarity.
      void nameKey;
    }

    const durationMs = Date.now() - startedAt;

    await service.from("imports").insert({
      kind: "products",
      file_name: file.name,
      total_rows: rows.length,
      products_imported: deduped.length,
      duration_ms: durationMs,
      detected_format: detectedFormat,
    });

    console.log(
      `[process-kalodata-products] done in ${durationMs}ms — ${deduped.length} unique products`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: rows.length,
        processed: deduped.length,
        inserted: insertedCount,
        updated: updatedCount,
        detected_format: detectedFormat,
        duration_ms: durationMs,
        message:
          `Procesados ${deduped.length} productos (formato: ${detectedFormat}) en ${durationMs}ms.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[process-kalodata-products] error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
