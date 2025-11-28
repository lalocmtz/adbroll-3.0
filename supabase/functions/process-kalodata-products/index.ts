import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductRow {
  "Nombre del producto": string;
  "URL del producto"?: string;
  "Categoría"?: string;
  "Precio (M$)"?: number;
  "Descripción"?: string;
  "Imagen URL"?: string;
  "Total Ventas": number;
  "Total Ingresos (M$)": number;
  "Promedio ROAS"?: number;
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

    console.log("Archivo de productos recibido:", file.name, "Tamaño:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ProductRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} productos del Excel`);

    // Sort by total revenue and take top entries
    const topProducts = rows
      .sort((a, b) => b["Total Ingresos (M$)"] - a["Total Ingresos (M$)"])
      .slice(0, 50); // Top 50 productos

    console.log(`Top ${topProducts.length} productos seleccionados, limpiando datos anteriores...`);

    // Delete existing data using service role
    const { error: deleteError } = await supabaseServiceClient
      .from("products")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      throw new Error(`Error al limpiar datos: ${deleteError.message}`);
    }

    console.log("Datos anteriores eliminados, insertando nuevos productos...");

    // Map and validate rows
    const validRows = topProducts.map((row) => ({
      producto_nombre: row["Nombre del producto"],
      producto_url: row["URL del producto"] || null,
      categoria: row["Categoría"] || null,
      precio_mxn: row["Precio (M$)"] || null,
      descripcion: row["Descripción"] || null,
      imagen_url: row["Imagen URL"] || null,
      total_ventas: row["Total Ventas"] || 0,
      total_ingresos_mxn: row["Total Ingresos (M$)"] || 0,
      promedio_roas: row["Promedio ROAS"] || null,
    }));

    console.log(`Insertando ${validRows.length} productos...`);

    // Insert new records
    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("products")
      .insert(validRows)
      .select();

    if (insertError) {
      console.error("Error insertando datos:", insertError);
      throw insertError;
    }

    console.log(`Productos insertados exitosamente: ${insertedData?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: insertedData?.length || 0,
        total: validRows.length,
        message: `Successfully processed ${insertedData?.length || 0} products.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error en process-kalodata-products:", error);
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
