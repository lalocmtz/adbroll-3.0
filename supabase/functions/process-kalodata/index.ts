import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

      return {
        video_url: normalizedUrl,
        original_url: videoUrl,
        rank: idx + 1,
        title: row["Descripción del vídeo"] || null,
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
      };
    }).filter(Boolean) as any[];

    console.log(`[TIMING] Build data: ${Date.now() - buildStart}ms`);

    // ========== PHASE 3: Deduplicate (keep highest revenue per URL) ==========
    const dedupeStart = Date.now();
    
    // Group by normalized URL
    const urlMap = new Map<string, any>();
    for (const video of videosRaw) {
      const existing = urlMap.get(video.video_url);
      if (!existing || video.revenue_mxn > existing.revenue_mxn) {
        urlMap.set(video.video_url, video);
      }
    }
    
    // Convert back to array and re-rank by revenue
    const uniqueVideos = Array.from(urlMap.values())
      .sort((a, b) => b.revenue_mxn - a.revenue_mxn)
      .map((v, idx) => ({ ...v, rank: idx + 1 }));

    console.log(`[TIMING] Dedupe: ${Date.now() - dedupeStart}ms, ${uniqueVideos.length} unique videos`);

    // ========== PHASE 4: Batch UPSERT (chunked for reliability) ==========
    const upsertStart = Date.now();
    const CHUNK_SIZE = 200;
    let totalInserted = 0;
    let totalUpdated = 0;

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
        .select("id");

      if (error) {
        console.error(`Chunk ${i / CHUNK_SIZE + 1} upsert error:`, error.message);
        // Continue with next chunk instead of failing completely
      } else {
        const count = data?.length || 0;
        totalInserted += count;
        console.log(`Chunk ${i / CHUNK_SIZE + 1}: upserted ${count} videos`);
      }
    }

    console.log(`[TIMING] Upsert: ${Date.now() - upsertStart}ms, total: ${totalInserted}`);

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
