// process-kalodata — Phase 2 rewrite (single-table).
//
// This function replaces the old 651-line fuzzy matcher with a deterministic
// pipeline:
//
//   1. Parse the XLSX, auto-detecting whether it's the old 14-column format
//      or the new 17-column Kalodata export.
//   2. For every row, derive a stable `tiktok_video_id` from the video URL.
//   3. Look up (or create) a matching product deterministically:
//        - by product URL (strongest signal)
//        - by TikTok product ID
//        - by exact normalized product name
//      If none exist, we create a product stub flagged `from_video=true`
//      so the founder can enrich it later without losing the link.
//   4. Bulk upsert into `daily_feed` on its natural key (`tiktok_video_id`).
//      Phase 2 consolidated the duplicate `videos` table away: `daily_feed`
//      is now the sole video-intelligence table the app reads from.
//   5. Write an `imports` log row with matched / stub / unmatched counts so
//      the Admin data-quality panel can show what happened.
//
// There is zero Levenshtein, zero substring matching. If the deterministic
// lookup fails, we always create a stub — never a silent mis-match.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import {
  type Row,
  VIDEO_COLUMNS,
  detectFormat,
  extractTikTokProductId,
  extractTikTokVideoId,
  normalizeTitle,
  pickInt,
  pickNumber,
  pickString,
} from "../_shared/kalodata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProductLike = {
  id: string;
  producto_nombre: string;
  producto_url: string | null;
  tiktok_product_id: string | null;
  price: number | null;
  total_ventas: number | null;
  total_ingresos_mxn: number | null;
};

type ProductIndex = {
  byUrl: Map<string, ProductLike>;
  byTikTokId: Map<string, ProductLike>;
  byName: Map<string, ProductLike>;
  all: ProductLike[];
};

function buildProductIndex(products: ProductLike[]): ProductIndex {
  const idx: ProductIndex = {
    byUrl: new Map(),
    byTikTokId: new Map(),
    byName: new Map(),
    all: products,
  };
  for (const p of products) {
    if (p.producto_url) idx.byUrl.set(p.producto_url.trim(), p);
    if (p.tiktok_product_id) idx.byTikTokId.set(p.tiktok_product_id, p);
    const key = normalizeTitle(p.producto_nombre);
    if (key) idx.byName.set(key, p);
  }
  return idx;
}

function lookupProduct(
  idx: ProductIndex,
  productUrl: string | null,
  productId: string | null,
  productName: string | null,
): ProductLike | null {
  if (productUrl) {
    const hit = idx.byUrl.get(productUrl.trim());
    if (hit) return hit;
  }
  if (productId) {
    const hit = idx.byTikTokId.get(productId);
    if (hit) return hit;
  }
  if (productName) {
    const hit = idx.byName.get(normalizeTitle(productName));
    if (hit) return hit;
  }
  return null;
}

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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
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

    console.log(`[process-kalodata] received ${file.name} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Row[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const detectedFormat = detectFormat(rows, "videos");
    console.log(
      `[process-kalodata] parsed ${rows.length} rows, detected=${detectedFormat}`,
    );

    if (rows.length === 0) {
      throw new Error("El archivo no contiene filas válidas");
    }

    // Pre-load existing products once — we do all lookups in-memory.
    const { data: productsRaw, error: productsError } = await service
      .from("products")
      .select(
        "id, producto_nombre, producto_url, tiktok_product_id, price, total_ventas, total_ingresos_mxn",
      );
    if (productsError) throw productsError;

    const productIndex = buildProductIndex((productsRaw ?? []) as ProductLike[]);
    console.log(`[process-kalodata] loaded ${productIndex.all.length} products`);

    // Stats + output collectors.
    let matchedCount = 0;
    let stubCount = 0;
    let unmatchedCount = 0;
    let insertedCount = 0;

    const now = new Date().toISOString();
    const dailyFeedUpserts: Record<string, unknown>[] = [];

    for (const row of rows) {
      const videoUrl = pickString(row, VIDEO_COLUMNS.videoUrl);
      const title = pickString(row, VIDEO_COLUMNS.title);
      if (!videoUrl || !title) {
        unmatchedCount++;
        continue;
      }

      const tiktokVideoId = extractTikTokVideoId(videoUrl);

      // Extract product fields (may be absent in v1 exports).
      const productName = pickString(row, VIDEO_COLUMNS.productName);
      const productUrl = pickString(row, VIDEO_COLUMNS.productUrl);
      const productImage = pickString(row, VIDEO_COLUMNS.productImage);
      const productIdFromRow = pickString(row, VIDEO_COLUMNS.productId)
        ?? extractTikTokProductId(productUrl);

      // 1. Try deterministic lookup.
      let matched = lookupProduct(productIndex, productUrl, productIdFromRow, productName);
      let matchedBy: string = "none";

      // 2. If nothing matched and we actually have a product name, create a stub.
      if (!matched && productName) {
        const stub = {
          producto_nombre: productName,
          producto_url: productUrl,
          tiktok_product_id: productIdFromRow,
          imagen_url: productImage,
          from_video: true,
          source: "kalodata_video_import",
          last_import: now,
          total_ventas: 0,
          total_ingresos_mxn: 0,
        };
        const { data: created, error: createError } = await service
          .from("products")
          .insert(stub)
          .select(
            "id, producto_nombre, producto_url, tiktok_product_id, price, total_ventas, total_ingresos_mxn",
          )
          .single();

        if (createError) {
          console.error(
            `[process-kalodata] failed to create stub for "${productName}":`,
            createError.message,
          );
        } else if (created) {
          matched = created as ProductLike;
          productIndex.all.push(matched);
          if (matched.producto_url) productIndex.byUrl.set(matched.producto_url, matched);
          if (matched.tiktok_product_id) {
            productIndex.byTikTokId.set(matched.tiktok_product_id, matched);
          }
          const nameKey = normalizeTitle(matched.producto_nombre);
          if (nameKey) productIndex.byName.set(nameKey, matched);
          stubCount++;
          matchedBy = "stub";
        }
      } else if (matched) {
        if (productUrl && productUrl === matched.producto_url) matchedBy = "product_url";
        else if (productIdFromRow && productIdFromRow === matched.tiktok_product_id) {
          matchedBy = "tiktok_product_id";
        } else matchedBy = "product_name";
        matchedCount++;
      } else {
        unmatchedCount++;
      }

      const revenue = pickNumber(row, VIDEO_COLUMNS.revenue) ?? 0;
      const sales = pickInt(row, VIDEO_COLUMNS.sales) ?? 0;

      dailyFeedUpserts.push({
        tiktok_video_id: tiktokVideoId,
        tiktok_url: videoUrl,
        rango_fechas: pickString(row, VIDEO_COLUMNS.dateRange) ?? "",
        descripcion_video: title,
        duracion: pickString(row, VIDEO_COLUMNS.duration) ?? "",
        creador: pickString(row, VIDEO_COLUMNS.creatorHandle) ?? "",
        fecha_publicacion: pickString(row, VIDEO_COLUMNS.publishedAt) ?? "",
        ingresos_mxn: revenue,
        ventas: sales,
        visualizaciones: pickInt(row, VIDEO_COLUMNS.views) ?? 0,
        gpm_mxn: pickNumber(row, VIDEO_COLUMNS.gpm),
        cpa_mxn: sales > 0 ? revenue / sales : (pickNumber(row, VIDEO_COLUMNS.cpa) ?? 0),
        ratio_ads: pickNumber(row, VIDEO_COLUMNS.adRatio),
        coste_publicitario_mxn: pickNumber(row, VIDEO_COLUMNS.adCost) ?? 0,
        roas: pickNumber(row, VIDEO_COLUMNS.roas) ?? 0,
        category: pickString(row, VIDEO_COLUMNS.category),
        country: pickString(row, VIDEO_COLUMNS.country),
        product_id: matched?.id ?? null,
        producto_nombre: matched?.producto_nombre ?? productName,
        producto_url: matched?.producto_url ?? productUrl,
        product_price: matched?.price ?? null,
        product_sales: matched?.total_ventas ?? null,
        product_revenue: matched?.total_ingresos_mxn ?? null,
        matched_by: matchedBy,
        source: "kalodata",
        last_import: now,
      });
    }

    // Bulk upsert into daily_feed on natural key. onConflict requires the
    // column to have a unique index (created in the Phase 1 migration).
    if (dailyFeedUpserts.length > 0) {
      const withId = dailyFeedUpserts.filter((r) => r.tiktok_video_id);
      const withoutId = dailyFeedUpserts.filter((r) => !r.tiktok_video_id);

      if (withId.length > 0) {
        const { error: upsertError, count } = await service
          .from("daily_feed")
          .upsert(withId, { onConflict: "tiktok_video_id", count: "exact" });
        if (upsertError) {
          console.error("[process-kalodata] daily_feed upsert error:", upsertError);
          throw upsertError;
        }
        insertedCount += count ?? withId.length;
      }
      if (withoutId.length > 0) {
        const { error: insertError } = await service.from("daily_feed").insert(withoutId);
        if (insertError) {
          console.error("[process-kalodata] daily_feed insert error:", insertError);
        } else {
          insertedCount += withoutId.length;
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    const { error: importLogError } = await service.from("imports").insert({
      kind: "videos",
      file_name: file.name,
      total_rows: rows.length,
      videos_imported: dailyFeedUpserts.length,
      matched_count: matchedCount,
      stub_count: stubCount,
      unmatched_count: unmatchedCount,
      duration_ms: durationMs,
      detected_format: detectedFormat,
    });
    if (importLogError) {
      console.error("[process-kalodata] import log error:", importLogError);
    }

    console.log(
      `[process-kalodata] done in ${durationMs}ms — ` +
        `${dailyFeedUpserts.length} videos, ${matchedCount} matched, ${stubCount} stubs, ${unmatchedCount} unmatched`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: rows.length,
        processed: dailyFeedUpserts.length,
        inserted: insertedCount,
        matched: matchedCount,
        stubs_created: stubCount,
        unmatched: unmatchedCount,
        detected_format: detectedFormat,
        duration_ms: durationMs,
        message:
          `Procesados ${dailyFeedUpserts.length} videos (${matchedCount} enlazados, ` +
          `${stubCount} stubs creados, ${unmatchedCount} sin match) en ${durationMs}ms.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[process-kalodata] error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
