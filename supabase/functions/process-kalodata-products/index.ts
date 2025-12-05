import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Kalodata column mappings - flexible detection
const COLUMN_MAPPINGS = {
  productName: ["Nombre del producto", "Product Name", "nombre_producto", "Nombre"],
  productUrl: ["URL del producto", "Product URL", "URL", "Link"],
  imageUrl: ["Imagen URL", "Image URL", "Imagen", "Image"],
  category: ["Categoría", "Category", "Categoria"],
  price: ["Precio (M$)", "Price (MXN)", "Precio", "Price"],
  commission: ["Comisión (%)", "Commission (%)", "Comision", "Commission"],
  revenue7d: ["Ingresos 7 días", "Revenue 7d", "Ingresos últimos 7 días", "7d Revenue"],
  revenue30d: ["Ingresos 30 días", "Revenue 30d", "Total Ingresos (M$)", "Total Revenue", "Ingresos"],
  sales7d: ["Ventas 7 días", "Sales 7d", "Ventas últimos 7 días", "7d Sales"],
  sales30d: ["Ventas 30 días", "Sales 30d", "Total Ventas", "Total Sales", "Ventas"],
  activeCreators: ["Creadores activos", "Active Creators", "Creadores"],
  conversionRate: ["% Conversión creadores", "Creator Conversion %", "Conversión"],
  roas: ["Promedio ROAS", "ROAS", "Avg ROAS"],
};

// Find column value by trying multiple possible names
function findColumnValue(row: any, possibleNames: string[]): any {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }
  return null;
}

// Parse numeric value handling ranges like "267.12-289.48"
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  const str = String(value).replace(/,/g, "").replace("$", "").replace("%", "").trim();
  
  if (str.includes("-")) {
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

// Extract short category from full path "Belleza y cuidado personal > Rizadores" → "Belleza"
function extractShortCategory(fullCategory: string | null): string | null {
  if (!fullCategory) return null;
  const parts = fullCategory.split(">");
  return parts[0].trim().split(" ")[0]; // First word of first segment
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
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} productos del Excel`);

    // Process and transform each row
    const processedProducts = rows.map((row) => {
      const productName = findColumnValue(row, COLUMN_MAPPINGS.productName);
      const productUrl = findColumnValue(row, COLUMN_MAPPINGS.productUrl);
      const imageUrl = findColumnValue(row, COLUMN_MAPPINGS.imageUrl);
      const fullCategory = findColumnValue(row, COLUMN_MAPPINGS.category);
      const price = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.price));
      const commission = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.commission));
      const revenue7d = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.revenue7d));
      const revenue30d = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.revenue30d));
      const sales7d = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.sales7d));
      const sales30d = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.sales30d));
      const roas = parseNumericValue(findColumnValue(row, COLUMN_MAPPINGS.roas));

      // Calculate derived fields
      // revenue_last_7_days: if exists use it, otherwise revenue_30d / 4
      const calculatedRevenue = revenue7d ?? (revenue30d ? revenue30d / 4 : null);
      
      // sales_last_7_days: if exists use it, otherwise sales_30d / 4
      const calculatedSales = sales7d ?? (sales30d ? Math.round(sales30d / 4) : null);
      
      // Short category
      const shortCategory = extractShortCategory(fullCategory);

      return {
        producto_nombre: productName,
        producto_url: productUrl || null,
        imagen_url: imageUrl || null,
        categoria: shortCategory,
        precio_mxn: price,
        commission: commission,
        total_ingresos_mxn: calculatedRevenue,
        total_ventas: calculatedSales,
        promedio_roas: roas,
      };
    }).filter(p => p.producto_nombre); // Filter out rows without product name

    // Sort by revenue (desc) and take Top 20
    const topProducts = processedProducts
      .sort((a, b) => (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0))
      .slice(0, 20);

    console.log(`Top 20 productos seleccionados, iniciando UPSERT...`);
    console.log(`Procesando ${topProducts.length} productos con UPSERT...`);

    // UPSERT products one by one based on product_name + product_url
    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of topProducts) {
      // Check if product exists by name AND url
      const { data: existing } = await supabaseServiceClient
        .from("products")
        .select("id")
        .eq("producto_nombre", product.producto_nombre)
        .maybeSingle();

      if (existing) {
        // UPDATE: update metrics only
        const { error: updateError } = await supabaseServiceClient
          .from("products")
          .update({
            precio_mxn: product.precio_mxn,
            price: product.precio_mxn,
            commission: product.commission,
            total_ingresos_mxn: product.total_ingresos_mxn,
            total_ventas: product.total_ventas,
            promedio_roas: product.promedio_roas,
            categoria: product.categoria,
            imagen_url: product.imagen_url,
            producto_url: product.producto_url,
            last_import: new Date().toISOString(),
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
          price: product.precio_mxn,
          last_import: new Date().toISOString(),
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
        total: topProducts.length,
        message: `Top 20 productos procesados: ${insertedCount} nuevos, ${updatedCount} actualizados. Auto-matching activado.`,
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
