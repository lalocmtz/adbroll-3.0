// process-kalodata-creators — Phase 1 rewrite.
//
// Flexible column detection (9 cols old / 18 cols new) + deterministic upsert
// on the unique `usuario_creador` handle. Matches the naming conventions in
// `_shared/kalodata.ts` so we never touch a creator twice.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import {
  type Row,
  CREATOR_COLUMNS,
  detectFormat,
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

    const detectedFormat = detectFormat(rows, "creators");
    console.log(
      `[process-kalodata-creators] ${rows.length} rows, detected=${detectedFormat}`,
    );
    if (rows.length === 0) throw new Error("El archivo no contiene filas válidas");

    const now = new Date().toISOString();

    const payloads = rows
      .map((row) => {
        const handle = pickString(row, CREATOR_COLUMNS.handle);
        if (!handle) return null;
        return {
          usuario_creador: handle,
          nombre_completo: pickString(row, CREATOR_COLUMNS.fullName),
          seguidores: pickInt(row, CREATOR_COLUMNS.followers),
          total_videos: pickInt(row, CREATOR_COLUMNS.totalVideos) ?? 0,
          total_ventas: pickInt(row, CREATOR_COLUMNS.totalSales) ?? 0,
          total_ingresos_mxn: pickNumber(row, CREATOR_COLUMNS.totalRevenue) ?? 0,
          promedio_visualizaciones: pickInt(row, CREATOR_COLUMNS.avgViews),
          promedio_roas: pickNumber(row, CREATOR_COLUMNS.avgRoas),
          mejor_video_url: pickString(row, CREATOR_COLUMNS.bestVideoUrl),
          country: pickString(row, CREATOR_COLUMNS.country),
          last_import: now,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Dedupe by handle within the file (keep highest revenue).
    const dedupe = new Map<string, typeof payloads[number]>();
    for (const c of payloads) {
      const existing = dedupe.get(c.usuario_creador);
      if (!existing || (c.total_ingresos_mxn ?? 0) > (existing.total_ingresos_mxn ?? 0)) {
        dedupe.set(c.usuario_creador, c);
      }
    }
    const deduped = Array.from(dedupe.values());

    let insertedCount = 0;
    if (deduped.length > 0) {
      const { error, count } = await service
        .from("creators")
        .upsert(deduped, { onConflict: "usuario_creador", count: "exact" });
      if (error) {
        console.error("[process-kalodata-creators] upsert error:", error);
        throw error;
      }
      insertedCount = count ?? deduped.length;
    }

    const durationMs = Date.now() - startedAt;

    await service.from("imports").insert({
      kind: "creators",
      file_name: file.name,
      total_rows: rows.length,
      creators_imported: deduped.length,
      duration_ms: durationMs,
      detected_format: detectedFormat,
    });

    console.log(
      `[process-kalodata-creators] done in ${durationMs}ms — ${deduped.length} creators`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: rows.length,
        processed: deduped.length,
        inserted: insertedCount,
        detected_format: detectedFormat,
        duration_ms: durationMs,
        message:
          `Procesados ${deduped.length} creadores (formato: ${detectedFormat}) en ${durationMs}ms.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[process-kalodata-creators] error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
