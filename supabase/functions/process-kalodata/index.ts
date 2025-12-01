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

    // Sort by revenue (no limit)
    const sortedVideos = rows
      .sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"])
      .map((row) => {
        return {
          video_url: row["Enlace de TikTok"],
          title: row["Descripción del vídeo"],
          creator_name: row["Usuario del creador"],
          creator_handle: row["Usuario del creador"],
          sales: row["Ventas"],
          revenue_mxn: row["Ingresos (M$)"],
          views: row["Visualizaciones"],
          roas: row["ROAS - Retorno de la inversión publicitaria"],
          category: null,
          country: null,
          rank: null,
          product_name: null,
          product_id: null,
        };
      });

    console.log(`Procesando ${sortedVideos.length} videos, eliminando videos existentes...`);

    // Delete all existing videos
    const { error: deleteError } = await supabaseServiceClient
      .from("videos")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      throw new Error(`Error al eliminar videos existentes: ${deleteError.message}`);
    }

    console.log("Videos eliminados, insertando nuevos...");

    // Insert all videos without limit
    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("videos")
      .insert(sortedVideos)
      .select();

    if (insertError) {
      console.error("Error insertando videos:", insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedData?.length || 0} videos`);

    const processedCount = insertedData?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: sortedVideos.length,
        message: `Successfully processed ${processedCount} videos from ${rows.length} rows.`,
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
