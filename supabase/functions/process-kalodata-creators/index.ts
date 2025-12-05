import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dynamic column mapping for Kalodata creator files
const COLUMN_MAPPINGS: Record<string, string[]> = {
  creator_name: ["creator name", "nombre del creador", "creator", "nombre", "name", "nombre completo"],
  username: ["username", "handle", "usuario", "usuario del creador", "@", "creator handle", "tiktok handle"],
  profile_image: ["profile image", "profile image url", "imagen", "avatar", "foto", "image url", "profile pic"],
  followers: ["followers", "seguidores", "follower count", "total followers"],
  revenue: ["revenue", "ingresos", "ingresos totales", "total revenue", "gmv", "total ingresos", "ingresos(m$)", "total ingresos (m$)"],
  views: ["views", "vistas", "content views", "total views", "vistas de contenido", "visualizaciones", "video views"],
  sales: ["sales", "ventas", "items sold", "artículos vendidos", "total ventas", "orders", "total orders"],
  conversion_rate: ["conversion rate", "tasa de conversión", "tasa conversión", "creator conversion", "conversion", "tasa de conversión del creador"],
  tiktok_url: ["tiktok url", "url", "profile url", "enlace", "link", "creator url", "tiktok link"],
  country: ["country", "país", "region", "location"],
  videos_count: ["videos", "total videos", "video count", "cantidad de videos"],
};

// Find matching column value dynamically
function findColumnValue(row: Record<string, any>, fieldName: string): any {
  const possibleNames = COLUMN_MAPPINGS[fieldName] || [];
  
  // Exact match first (case-insensitive)
  for (const colName of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim() === colName.toLowerCase()) {
        return row[key];
      }
    }
  }
  
  // Partial match
  for (const colName of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes(colName.toLowerCase()) || 
          colName.toLowerCase().includes(key.toLowerCase())) {
        return row[key];
      }
    }
  }
  
  return null;
}

// Parse numeric values safely
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  
  const str = String(value).replace(/[$,MXN\s%]/gi, "").trim();
  
  // Handle ranges
  if (str.includes("-") && !str.startsWith("-")) {
    const parts = str.split("-");
    const num1 = parseFloat(parts[0]);
    const num2 = parseFloat(parts[1]);
    if (!isNaN(num1) && !isNaN(num2)) {
      return (num1 + num2) / 2;
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
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

    // Create service role client for database operations
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
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel`);
    
    if (rows.length > 0) {
      console.log("Columnas detectadas:", Object.keys(rows[0]));
    }

    // Process each row with dynamic column detection
    const processedCreators = rows.map((row, index) => {
      const creatorName = findColumnValue(row, "creator_name");
      const username = findColumnValue(row, "username");
      const profileImage = findColumnValue(row, "profile_image");
      const followers = parseNumericValue(findColumnValue(row, "followers"));
      const revenue = parseNumericValue(findColumnValue(row, "revenue"));
      const views = parseNumericValue(findColumnValue(row, "views"));
      const sales = parseNumericValue(findColumnValue(row, "sales"));
      const conversionRate = parseNumericValue(findColumnValue(row, "conversion_rate"));
      const tiktokUrl = findColumnValue(row, "tiktok_url");
      const country = findColumnValue(row, "country");
      const videosCount = parseNumericValue(findColumnValue(row, "videos_count"));

      // Username is required - try to extract from name if not available
      const finalUsername = username || creatorName || `creator_${index + 1}`;

      return {
        usuario_creador: String(finalUsername).replace("@", "").trim(),
        nombre_completo: creatorName ? String(creatorName).trim() : null,
        creator_handle: String(finalUsername).replace("@", "").trim(),
        seguidores: followers ? Math.round(followers) : null,
        total_ingresos_mxn: revenue || 0,
        total_ventas: sales ? Math.round(sales) : 0,
        total_videos: videosCount ? Math.round(videosCount) : 0,
        promedio_visualizaciones: views ? Math.round(views) : null,
        promedio_roas: conversionRate, // Store conversion rate here (reusing field)
        mejor_video_url: tiktokUrl ? String(tiktokUrl).trim() : null,
        country: country ? String(country).trim() : null,
      };
    }).filter(c => c.usuario_creador && c.usuario_creador !== "creator_0");

    console.log(`Creadores procesados: ${processedCreators.length}`);

    // Sort by revenue descending and take Top 50
    const sortedCreators = processedCreators.sort((a, b) => {
      return (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0);
    });

    const top50Creators = sortedCreators.slice(0, 50);
    console.log(`Top 50 creadores seleccionados`);

    // Delete ALL existing creators
    console.log("Eliminando creadores anteriores...");
    const { error: deleteError } = await supabaseServiceClient
      .from("creators")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Error deleting creators:", deleteError);
    } else {
      console.log("Creadores anteriores eliminados");
    }

    // Insert new creators
    console.log(`Insertando ${top50Creators.length} creadores...`);
    if (top50Creators.length > 0) {
      console.log("Ejemplo creador:", JSON.stringify(top50Creators[0], null, 2));
    }

    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("creators")
      .insert(top50Creators)
      .select();

    if (insertError) {
      console.error("Error inserting creators:", insertError);
      throw new Error(`Error al insertar creadores: ${insertError.message}`);
    }

    console.log(`${insertedData?.length || 0} creadores insertados exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: top50Creators.length,
        total: rows.length,
        message: `Se importaron los Top ${top50Creators.length} creadores de ${rows.length} filas.`,
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
