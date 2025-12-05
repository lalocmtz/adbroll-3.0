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

    console.log(`Top ${topProducts.length} productos seleccionados, iniciando UPSERT...`);

    // Map and validate rows with price parsing
    const validRows = topProducts.map((row) => {
      // Parse price - handle ranges like "267.12-289.48"
      let parsedPrice: number | null = null;
      const precioValue = row["Precio (M$)"];
      
      if (precioValue !== null && precioValue !== undefined) {
        const precioStr = String(precioValue);
        if (precioStr.includes("-")) {
          // It's a range, take the average
          const parts = precioStr.split("-");
          const num1 = parseFloat(parts[0]);
          const num2 = parseFloat(parts[1]);
          if (!isNaN(num1) && !isNaN(num2)) {
            parsedPrice = (num1 + num2) / 2;
          }
        } else {
          const num = parseFloat(precioStr);
          if (!isNaN(num)) {
            parsedPrice = num;
          }
        }
      }

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
        producto_nombre: row["Nombre del producto"],
        producto_url: row["URL del producto"] || null,
        categoria: row["Categoría"] || null,
        precio_mxn: parsedPrice,
        descripcion: row["Descripción"] || null,
        imagen_url: row["Imagen URL"] || null,
        total_ventas: row["Total Ventas"] || 0,
        total_ingresos_mxn: row["Total Ingresos (M$)"] || 0,
        promedio_roas: parsedRoas,
      };
    });

    console.log(`Procesando ${validRows.length} productos con UPSERT...`);

    // UPSERT products one by one based on product_name + product_url
    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of validRows) {
      // Check if product exists by name AND url
      const { data: existing } = await supabaseServiceClient
        .from("products")
        .select("id")
        .eq("producto_nombre", product.producto_nombre)
        .eq("producto_url", product.producto_url || "")
        .maybeSingle();

      if (existing) {
        // UPDATE: update metrics only
        const { error: updateError } = await supabaseServiceClient
          .from("products")
          .update({
            precio_mxn: product.precio_mxn,
            price: product.precio_mxn,
            total_ingresos_mxn: product.total_ingresos_mxn,
            total_ventas: product.total_ventas,
            promedio_roas: product.promedio_roas,
            categoria: product.categoria,
            descripcion: product.descripcion,
            imagen_url: product.imagen_url,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(`Error updating product ${product.producto_nombre}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // INSERT: new product
        const insertData = {
          ...product,
          price: product.precio_mxn, // Also set price field
        };
        
        const { error: insertError } = await supabaseServiceClient
          .from("products")
          .insert(insertData);

        if (insertError) {
          console.error(`Error inserting product ${product.producto_nombre}:`, insertError);
        } else {
          insertedCount++;
        }
      }
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated`);

    // Trigger auto-matching after products import
    console.log('Triggering auto-match videos to products...');
    try {
      const matchResponse = await supabaseServiceClient.functions.invoke('auto-match-videos-products');
      if (matchResponse.error) {
        console.error('Error invoking auto-match:', matchResponse.error);
      } else {
        console.log('Auto-match triggered successfully:', matchResponse.data);
      }
    } catch (matchError) {
      console.error('Failed to trigger auto-match:', matchError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        processed: insertedCount + updatedCount,
        total: validRows.length,
        message: `Successfully processed ${insertedCount + updatedCount} products: ${insertedCount} new, ${updatedCount} updated. Auto-matching triggered.`,
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
