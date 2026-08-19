import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import {
  extractTikTokVideoId,
  extractTikTokProductId,
  pickString,
  VIDEO_COLUMNS,
} from "../_shared/kalodata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExcelRow {
  "Rango de fechas": string;
  "Descripción del vídeo": string;
  "Duración": string;
  "Usuario del creador": string;
  "Fecha de publicación": string;
  "Ingresos (M$)": number;
  "Ventas": number;
  "Visualizaciones": number;
  "GPM (M$) - Ingresos brutos por cada mil visualizaciones": number;
  "CPA (M$) - Coste por acción": number;
  "Ratio de visualizaciones de Ads": number;
  "Coste publicitario (M$)": number;
  "ROAS - Retorno de la inversión publicitaria": number;
  "Enlace de TikTok": string;
}

// Normalize URL for deduplication
function normalizeVideoUrl(url: string): string {
  if (!url) return "";
  try {
    // Trim whitespace
    let normalized = url.trim();
    // Remove common tracking params
    const urlObj = new URL(normalized);
    urlObj.searchParams.delete('is_from_webapp');
    urlObj.searchParams.delete('sender_device');
    urlObj.searchParams.delete('sender_web_id');
    urlObj.searchParams.delete('_r');
    return urlObj.toString();
  } catch {
    return url.trim();
  }
}

// Generic hashtags to ignore when extracting product names
const GENERIC_HASHTAGS = new Set([
  'fyp', 'foryou', 'foryoupage', 'parati', 'viral', 'viralvideo', 'trending',
  'tiktok', 'tiktokmx', 'tiktokmexico', 'tiktokviral', 'tiktokshop', 'tiktokshopmexico',
  'tiktokfinds', 'tiktokusa', 'tiktokmademebuyit', 'compratiktok', 'asmr',
  'humor', 'comedia', 'funny', 'lol', 'greenscreen', 'review', 'unboxing',
  'haul', 'reseña', 'recomendacion', 'tutorial', 'diy', 'howto', 'hack', 'lifehack',
  'fy', 'fypシ', 'xyzba', 'xyzbca', 'xyz', 'duet', 'stitch', 'voiceover'
]);

// Extract meaningful product name from video description/hashtags
function extractProductNameFromDescription(description: string | null): string | null {
  if (!description) return null;
  
  // Extract all hashtags
  const hashtagRegex = /#(\w+)/gi;
  const matches = description.match(hashtagRegex) || [];
  const hashtags = matches.map(h => h.slice(1).toLowerCase());
  
  // Filter out generic hashtags
  const meaningfulHashtags = hashtags.filter(h => !GENERIC_HASHTAGS.has(h) && h.length > 2);
  
  if (meaningfulHashtags.length === 0) {
    // Try extracting text before first hashtag as product name
    const textBeforeHashtag = description.split('#')[0].trim();
    if (textBeforeHashtag.length > 3 && textBeforeHashtag.length < 100) {
      return textBeforeHashtag;
    }
    return null;
  }
  
  // Take up to 3 most meaningful hashtags and combine them
  // Capitalize first letter of each word for readability
  const productWords = meaningfulHashtags.slice(0, 3).map(h => 
    h.charAt(0).toUpperCase() + h.slice(1)
  );
  
  return productWords.join(' ');
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("No autenticado");

    console.log("Usuario autenticado:", user.email);

    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Acceso denegado: solo fundador puede procesar archivos");
    }

    console.log("Rol de fundador verificado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const market = formData.get("market") as string || "mx";
    
    if (!file) throw new Error("No se proporcionó archivo");

    console.log("Archivo recibido:", file.name, "Tamaño:", file.size, "Market:", market);

    // ========== PHASE 1: Parse Excel (fast) ==========
    const parseStart = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`[TIMING] Parse Excel: ${Date.now() - parseStart}ms, ${rows.length} rows`);

    // ========== PHASE 2: Build video data (no matching - fast) ==========
    const buildStart = Date.now();
    
    // Build video data WITHOUT matching (leave product_id null for auto-match later)
    const videosRaw = rows.map((row, idx) => {
      const videoUrl = row["Enlace de TikTok"];
      if (!videoUrl) return null;
      
      const normalizedUrl = normalizeVideoUrl(videoUrl);
      const creatorHandle = row["Usuario del creador"] || null;
      const revenueMxn = row["Ingresos (M$)"] || 0;

      const videoDescription = row["Descripción del vídeo"] || null;
      // Extract product name from description/hashtags for better matching
      const extractedProductName = extractProductNameFromDescription(videoDescription);

      // Backbone determinista: si el export trae el producto, guardamos su
      // URL original y el tiktok_product_id derivado. El ID manda sobre el
      // texto en la fase de matching.
      const anyRow = row as unknown as Record<string, unknown>;
      const sourceProductUrl = pickString(anyRow, [...VIDEO_COLUMNS.productUrl]);
      const explicitProductId = pickString(anyRow, [...VIDEO_COLUMNS.productId]);
      const tiktokProductId =
        (explicitProductId && /^\d{6,}$/.test(explicitProductId) ? explicitProductId : null) ??
        extractTikTokProductId(sourceProductUrl);
      const exportProductName = pickString(anyRow, [...VIDEO_COLUMNS.productName]);

      return {
        video_url: normalizedUrl,
        original_url: videoUrl,
        // Llave natural de TikTok (data backbone): extraída de la URL.
        tiktok_video_id: extractTikTokVideoId(normalizedUrl),
        tiktok_product_id: tiktokProductId,
        source_product_url: sourceProductUrl,
        rank: idx + 1,
        title: videoDescription,
        // Nombre real del producto si el export lo trae; si no, el extraído.
        product_name: exportProductName ?? extractedProductName,
        creator_name: creatorHandle,
        creator_handle: creatorHandle,
        sales: row["Ventas"] || 0,
        revenue_mxn: revenueMxn,
        views: row["Visualizaciones"] || 0,
        roas: row["ROAS - Retorno de la inversión publicitaria"] || null,
        country: market,
        processing_status: 'pending',
        imported_at: new Date().toISOString(),
        snapshot_date_range: row["Rango de fechas"] || null,
        snapshot_at: new Date().toISOString(),
      };
    }).filter(Boolean) as any[];

    console.log(`[TIMING] Build data: ${Date.now() - buildStart}ms`);

    // ========== PHASE 3: Deduplicate (keep highest revenue per URL) ==========
    const dedupeStart = Date.now();
    
    // Group by natural key: tiktok_video_id si existe (dos URLs distintas
    // pueden apuntar al mismo video), si no por URL normalizada.
    const urlMap = new Map<string, any>();
    for (const video of videosRaw) {
      const dedupeKey = video.tiktok_video_id || video.video_url;
      const existing = urlMap.get(dedupeKey);
      if (!existing || video.revenue_mxn > existing.revenue_mxn) {
        urlMap.set(dedupeKey, video);
      }
    }
    
    // Convert back to array and re-rank by revenue
    const uniqueVideos = Array.from(urlMap.values())
      .sort((a, b) => b.revenue_mxn - a.revenue_mxn)
      .map((v, idx) => ({ ...v, rank: idx + 1 }));

    console.log(`[TIMING] Dedupe: ${Date.now() - dedupeStart}ms, ${uniqueVideos.length} unique videos`);

    // ========== PHASE 3.5: Reset rank for all videos in this market ==========
    // This ensures only videos in the NEW file get a rank
    const resetStart = Date.now();
    console.log(`Reseteando rank de todos los videos en ${market}...`);
    const { error: resetError } = await supabaseServiceClient
      .from("videos")
      .update({ rank: null, snapshot_at: null })
      .eq("country", market);
    
    if (resetError) {
      console.error("Error resetting ranks:", resetError.message);
    } else {
      console.log(`[TIMING] Reset ranks: ${Date.now() - resetStart}ms`);
    }

    // ========== PHASE 4: Batch UPSERT (chunked for reliability) ==========
    const upsertStart = Date.now();
    const CHUNK_SIZE = 200;
    let totalInserted = 0;
    let totalUpdated = 0;
    const upsertedRows: { id: string; video_url: string; rank: number | null; tiktok_video_id: string | null }[] = [];

    for (let i = 0; i < uniqueVideos.length; i += CHUNK_SIZE) {
      const chunk = uniqueVideos.slice(i, i + CHUNK_SIZE);

      // Remove original_url (not a real column), prepare upsert payload
      const upsertPayload = chunk.map(v => {
        const { original_url, ...rest } = v;
        return rest;
      });

      const { data, error } = await supabaseServiceClient
        .from("videos")
        .upsert(upsertPayload, {
          onConflict: 'video_url',
          ignoreDuplicates: false
        })
        .select("id, video_url, rank, tiktok_video_id");

      if (error) {
        console.error(`Chunk ${i / CHUNK_SIZE + 1} upsert error:`, error.message);
        // Continue with next chunk instead of failing completely
      } else {
        const count = data?.length || 0;
        totalInserted += count;
        if (data) upsertedRows.push(...data);
        console.log(`Chunk ${i / CHUNK_SIZE + 1}: upserted ${count} videos`);
      }
    }

    console.log(`[TIMING] Upsert: ${Date.now() - upsertStart}ms, total: ${totalInserted}`);

    // ========== PHASE 5: daily_rankings (histórico del ranking del día) ==========
    // videos.rank se resetea con cada import; daily_rankings preserva el
    // ranking por (market, fecha, rank). Best-effort: nunca rompe el import.
    // Rango de fechas del snapshot (el mismo para todo el export).
    const snapshotDateRange = uniqueVideos.find((v) => v.snapshot_date_range)?.snapshot_date_range ?? null;

    try {
      const rankingsStart = Date.now();
      const today = new Date().toISOString().slice(0, 10);
      const rankingRows = upsertedRows
        .filter((r) => r.rank != null)
        .map((r) => ({
          market,
          ranking_date: today,
          rank: r.rank as number,
          video_id: r.id,
          tiktok_video_id: r.tiktok_video_id ?? extractTikTokVideoId(r.video_url),
          snapshot_date_range: snapshotDateRange,
        }));

      let rankingsUpserted = 0;
      for (let i = 0; i < rankingRows.length; i += CHUNK_SIZE) {
        const chunk = rankingRows.slice(i, i + CHUNK_SIZE);
        const { error: rankError } = await supabaseServiceClient
          .from("daily_rankings")
          .upsert(chunk, { onConflict: "market,ranking_date,rank", ignoreDuplicates: false });
        if (rankError) {
          console.error(`daily_rankings chunk ${i / CHUNK_SIZE + 1} error:`, rankError.message);
        } else {
          rankingsUpserted += chunk.length;
        }
      }
      console.log(`[TIMING] daily_rankings: ${Date.now() - rankingsStart}ms, upserted: ${rankingsUpserted}`);
    } catch (rankingsError) {
      console.error("daily_rankings insert failed (non-fatal):", rankingsError);
    }

    // ========== PHASE 6: registro del import (histórico publicado) ==========
    try {
      await supabaseServiceClient.from("imports").insert({
        file_name: file.name,
        market,
        kind: "videos",
        date_range: snapshotDateRange,
        total_rows: rows.length,
        videos_imported: totalInserted,
        published_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
    } catch (importLogError) {
      console.error("imports log failed (non-fatal):", importLogError);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] Total process time: ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: rows.length,
        unique: uniqueVideos.length,
        upserted: totalInserted,
        market,
        timing_ms: totalTime,
        message: `Importación rápida (${market.toUpperCase()}): ${uniqueVideos.length} videos procesados en ${(totalTime / 1000).toFixed(1)}s. Usa "Procesar Pendientes" para descargar MP4s y hacer matching.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error en process-kalodata:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
