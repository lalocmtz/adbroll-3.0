import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatorRow {
  "Usuario del creador": string;
  "Nombre completo"?: string;
  "Seguidores"?: number;
  "Total Videos": number;
  "Total Ventas": number;
  "Total Ingresos (M$)": number;
  "Promedio Visualizaciones"?: number;
  "Promedio ROAS"?: number;
  "Mejor Video URL"?: string;
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

    console.log("Archivo de creadores recibido:", file.name, "Tamaño:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: CreatorRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} creadores del Excel`);

    // Sort by total revenue and take top entries
    const topCreators = rows
      .sort((a, b) => b["Total Ingresos (M$)"] - a["Total Ingresos (M$)"])
      .slice(0, 100); // Top 100 creadores

    console.log(`Top ${topCreators.length} creadores seleccionados, limpiando datos anteriores...`);

    // Delete existing data using service role
    const { error: deleteError } = await supabaseServiceClient
      .from("creators")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      throw new Error(`Error al limpiar datos: ${deleteError.message}`);
    }

    console.log("Datos anteriores eliminados, insertando nuevos creadores...");

    // Map and validate rows
    const validRows = topCreators.map((row) => ({
      usuario_creador: row["Usuario del creador"],
      nombre_completo: row["Nombre completo"] || null,
      seguidores: row["Seguidores"] || null,
      total_videos: row["Total Videos"] || 0,
      total_ventas: row["Total Ventas"] || 0,
      total_ingresos_mxn: row["Total Ingresos (M$)"] || 0,
      promedio_visualizaciones: row["Promedio Visualizaciones"] || null,
      promedio_roas: row["Promedio ROAS"] || null,
      mejor_video_url: row["Mejor Video URL"] || null,
    }));

    console.log(`Insertando ${validRows.length} creadores...`);

    // Insert new records
    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("creators")
      .insert(validRows)
      .select();

    if (insertError) {
      console.error("Error insertando datos:", insertError);
      throw insertError;
    }

    console.log(`Creadores insertados exitosamente: ${insertedData?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: insertedData?.length || 0,
        total: validRows.length,
        message: `Successfully processed ${insertedData?.length || 0} creators.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error en process-kalodata-creators:", error);
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
