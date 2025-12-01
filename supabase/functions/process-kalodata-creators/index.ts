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

    console.log(`Top ${topCreators.length} creadores seleccionados, iniciando UPSERT...`);

    // Map and validate rows with ROAS parsing
    const validRows = topCreators.map((row) => {
      // Parse ROAS - handle percentages and ranges
      let parsedRoas: number | null = null;
      const roasValue = row["Promedio ROAS"];
      
      if (roasValue !== null && roasValue !== undefined) {
        const roasStr = String(roasValue);
        // Remove % if present and handle ranges
        let cleanValue = roasStr.replace("%", "").trim();
        if (cleanValue.includes("-")) {
          const parts = cleanValue.split("-");
          const num1 = parseFloat(parts[0]);
          const num2 = parseFloat(parts[1]);
          if (!isNaN(num1) && !isNaN(num2)) {
            parsedRoas = (num1 + num2) / 2;
          }
        } else {
          const num = parseFloat(cleanValue);
          if (!isNaN(num)) {
            parsedRoas = num;
          }
        }
      }

      return {
        usuario_creador: row["Usuario del creador"],
        nombre_completo: row["Nombre completo"] || null,
        seguidores: row["Seguidores"] || null,
        total_videos: row["Total Videos"] || 0,
        total_ventas: row["Total Ventas"] || 0,
        total_ingresos_mxn: row["Total Ingresos (M$)"] || 0,
        promedio_visualizaciones: row["Promedio Visualizaciones"] || null,
        promedio_roas: parsedRoas,
        mejor_video_url: row["Mejor Video URL"] || null,
      };
    });

    console.log(`Procesando ${validRows.length} creadores con UPSERT...`);

    // UPSERT creators one by one based on creator_handle
    let insertedCount = 0;
    let updatedCount = 0;

    for (const creator of validRows) {
      // Check if creator exists by usuario_creador (handle)
      const { data: existing } = await supabaseServiceClient
        .from("creators")
        .select("id")
        .eq("usuario_creador", creator.usuario_creador)
        .maybeSingle();

      if (existing) {
        // UPDATE: update metrics only
        const { error: updateError } = await supabaseServiceClient
          .from("creators")
          .update({
            seguidores: creator.seguidores,
            total_ingresos_mxn: creator.total_ingresos_mxn,
            total_ventas: creator.total_ventas,
            total_videos: creator.total_videos,
            promedio_visualizaciones: creator.promedio_visualizaciones,
            promedio_roas: creator.promedio_roas,
            mejor_video_url: creator.mejor_video_url,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(`Error updating creator ${creator.usuario_creador}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // INSERT: new creator
        const { error: insertError } = await supabaseServiceClient
          .from("creators")
          .insert(creator);

        if (insertError) {
          console.error(`Error inserting creator ${creator.usuario_creador}:`, insertError);
        } else {
          insertedCount++;
        }
      }
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        processed: insertedCount + updatedCount,
        total: validRows.length,
        message: `Successfully processed ${insertedCount + updatedCount} creators: ${insertedCount} new, ${updatedCount} updated.`,
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
