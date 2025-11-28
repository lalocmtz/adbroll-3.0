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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify founder role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("No autenticado");
    }

    console.log("Usuario autenticado:", user.email);

    // Check founder role
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

    // Create service role client for database operations (bypasses RLS)
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse Excel file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No se proporcionó archivo");
    }

    console.log("Archivo recibido:", file.name, "Tamaño:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel`);

    // Sort by revenue and take top 20
    const top20 = rows
      .sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"])
      .slice(0, 20);

    console.log(`Top 20 seleccionados, limpiando datos anteriores...`);

    // Delete existing data using service role
    const { error: deleteError } = await supabaseServiceClient
      .from("daily_feed")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      throw new Error(`Error al limpiar datos: ${deleteError.message}`);
    }

    console.log("Datos anteriores eliminados, insertando nuevos videos...");

    // Process each video
    const processedVideos = [];
    const failedVideos = [];

    for (let i = 0; i < top20.length; i++) {
      const row = top20[i];
      try {
        console.log(`Procesando video ${i + 1}/20: ${row["Usuario del creador"]}`);

        // For MVP, use placeholder transcripts (AI integration in Phase 3)
        const transcripcion = `[Transcripción pendiente] Video de ${row["Usuario del creador"]}: ${row["Descripción del vídeo"]}`;
        const guionIA = `[Guión IA pendiente] Este video generó ${row["Ventas"]} ventas con un ROAS de ${row["ROAS - Retorno de la inversión publicitaria"]}x. Descripción: ${row["Descripción del vídeo"]}`;

        // Parse ratio_ads percentage
        let ratioAds: number | null = null;
        const ratioValue = row["Ratio de visualizaciones de Ads"] as string | number;
        if (typeof ratioValue === "string" && (ratioValue as string).includes("%")) {
          ratioAds = parseFloat((ratioValue as string).replace("%", ""));
        } else if (typeof ratioValue === "number") {
          ratioAds = ratioValue;
        }

        // Insert into database using service role
        const { error: insertError } = await supabaseServiceClient
          .from("daily_feed")
          .insert({
            rango_fechas: row["Rango de fechas"],
            descripcion_video: row["Descripción del vídeo"],
            duracion: row["Duración"],
            creador: row["Usuario del creador"],
            fecha_publicacion: row["Fecha de publicación"],
            ingresos_mxn: row["Ingresos (M$)"],
            ventas: row["Ventas"],
            visualizaciones: row["Visualizaciones"],
            gpm_mxn: row["GPM (M$) - Ingresos brutos por cada mil visualizaciones"],
            cpa_mxn: row["CPA (M$) - Coste por acción"],
            ratio_ads: ratioAds,
            coste_publicitario_mxn: row["Coste publicitario (M$)"],
            roas: row["ROAS - Retorno de la inversión publicitaria"],
            tiktok_url: row["Enlace de TikTok"],
            transcripcion_original: transcripcion,
            guion_ia: guionIA,
          });

        if (insertError) {
          console.error(`Error insertando video ${i + 1}:`, insertError.message);
          failedVideos.push({
            index: i + 1,
            creador: row["Usuario del creador"],
            error: insertError.message,
          });
          continue;
        }

        processedVideos.push(row["Usuario del creador"]);
      } catch (videoError) {
        console.error(`Error procesando video ${i + 1}:`, videoError);
        failedVideos.push({
          index: i + 1,
          creador: row["Usuario del creador"],
          error: videoError instanceof Error ? videoError.message : "Error desconocido",
        });
        continue;
      }
    }

    console.log(`✅ Procesados ${processedVideos.length} videos exitosamente`);
    if (failedVideos.length > 0) {
      console.log(`⚠️ ${failedVideos.length} videos fallaron:`, failedVideos);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedVideos.length,
        total: top20.length,
        failed: failedVideos.length,
        failedVideos: failedVideos,
        message: `${processedVideos.length} videos procesados exitosamente`,
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
