import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Column mapping - maps various possible column names to our internal fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  rank: ["#", "rank", "ranking", "posición"],
  name: ["product name", "nombre del producto", "product", "nombre", "name"],
  image_url: ["main image", "imagen url", "image", "imagen", "image url", "product image"],
  product_url: ["product url", "url del producto", "url", "link", "product link"],
  category_raw: ["category", "categoría", "categoria"],
  price: ["price (mxn)", "precio (m$)", "precio", "price", "precio mxn"],
  commission_rate: ["commission %", "comisión %", "commission", "comision", "comisión"],
  commission_mxn: ["commission (mxn)", "comisión (mxn)", "comision mxn"],
  gmv_7d: ["gmv 7d", "gmv 7 días", "gmv 7 days", "ingresos 7d", "revenue 7d", "gmv"],
  gmv_30d: ["gmv 30d", "gmv 30 días", "gmv 30 days", "ingresos 30d", "revenue 30d"],
  sales_7d: ["orders 7d", "ventas 7d", "sales 7d", "orders 7 days", "pedidos 7d"],
  sales_30d: ["orders 30d", "ventas 30d", "sales 30d", "orders 30 days", "pedidos 30d"],
  creators_active: ["creators active", "creadores activos", "active creators", "creators"],
  creator_conversion_rate: ["creator conversion rate", "tasa conversión creadores", "conversion rate", "conversión"],
};

// Find the matching column name in the row
function findColumnValue(row: Record<string, any>, fieldName: string): any {
  const possibleNames = COLUMN_MAPPINGS[fieldName] || [];
  
  // First try exact match (case-insensitive)
  for (const colName of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim() === colName.toLowerCase()) {
        return row[key];
      }
    }
  }
  
  // Then try partial match
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

// Parse numeric values - handles ranges like "267.12-289.48" and percentages
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  const str = String(value).replace(/[$,]/g, "").trim();
  
  // Handle ranges - take average
  if (str.includes("-") && !str.startsWith("-")) {
    const parts = str.split("-");
    const num1 = parseFloat(parts[0]);
    const num2 = parseFloat(parts[1]);
    if (!isNaN(num1) && !isNaN(num2)) {
      return (num1 + num2) / 2;
    }
  }
  
  // Handle percentages
  const cleanValue = str.replace("%", "").trim();
  const num = parseFloat(cleanValue);
  return isNaN(num) ? null : num;
}

// Extract short category from full path
// "Belleza y cuidado personal > Aparatos > Rizadores" → "Belleza y cuidado personal"
function extractShortCategory(fullCategory: string | null): string | null {
  if (!fullCategory) return null;
  const parts = fullCategory.split(">");
  return parts[0].trim();
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
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel`);
    
    // Log first row columns for debugging
    if (rows.length > 0) {
      console.log("Columnas detectadas:", Object.keys(rows[0]));
    }

    // Process each row
    const processedProducts = rows.map((row, index) => {
      // Extract values using dynamic column detection
      const rank = parseNumericValue(findColumnValue(row, "rank")) || index + 1;
      const name = findColumnValue(row, "name");
      const imageUrl = findColumnValue(row, "image_url");
      const productUrl = findColumnValue(row, "product_url");
      const categoryRaw = findColumnValue(row, "category_raw");
      const price = parseNumericValue(findColumnValue(row, "price"));
      const commissionRate = parseNumericValue(findColumnValue(row, "commission_rate"));
      let commissionMxn = parseNumericValue(findColumnValue(row, "commission_mxn"));
      const gmv7d = parseNumericValue(findColumnValue(row, "gmv_7d"));
      const gmv30d = parseNumericValue(findColumnValue(row, "gmv_30d"));
      const sales7d = parseNumericValue(findColumnValue(row, "sales_7d"));
      const sales30d = parseNumericValue(findColumnValue(row, "sales_30d"));
      const creatorsActive = parseNumericValue(findColumnValue(row, "creators_active"));
      const creatorConversionRate = parseNumericValue(findColumnValue(row, "creator_conversion_rate"));

      // Calculate derived values
      // GMV 7d: use direct value or calculate from 30d
      const calculatedGmv7d = gmv7d ?? (gmv30d ? gmv30d / 4 : null);
      
      // Sales 7d: use direct value or calculate from 30d
      const calculatedSales7d = sales7d ?? (sales30d ? Math.round(sales30d / 4) : null);
      
      // Commission MXN: if not provided, calculate from price and rate
      if (!commissionMxn && price && commissionRate) {
        commissionMxn = price * (commissionRate / 100);
      }
      
      // Extract short category
      const categoryShort = extractShortCategory(categoryRaw);

      return {
        rank,
        producto_nombre: name || `Producto ${index + 1}`,
        imagen_url: imageUrl || null,
        producto_url: productUrl || null,
        categoria: categoryShort,
        precio_mxn: price,
        price: price,
        commission: commissionRate,
        commission_mxn: commissionMxn,
        total_ingresos_mxn: calculatedGmv7d,
        total_ventas: calculatedSales7d,
        creators_active: creatorsActive,
        creator_conversion_rate: creatorConversionRate,
        gmv_7d: calculatedGmv7d,
        sales_7d: calculatedSales7d,
      };
    }).filter(p => p.producto_nombre); // Filter out products without names

    console.log(`Productos procesados: ${processedProducts.length}`);

    // Sort by GMV 7d (revenue) descending, fallback to sales if no revenue
    const sortedProducts = processedProducts.sort((a, b) => {
      const aValue = a.total_ingresos_mxn || a.total_ventas || 0;
      const bValue = b.total_ingresos_mxn || b.total_ventas || 0;
      return bValue - aValue;
    });

    // Take top 20
    const top20Products = sortedProducts.slice(0, 20);
    console.log(`Top 20 productos seleccionados`);

    // Delete all existing products
    console.log("Eliminando productos anteriores...");
    const { error: deleteError } = await supabaseServiceClient
      .from("products")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.error("Error deleting products:", deleteError);
    } else {
      console.log("Productos anteriores eliminados");
    }

    // Insert new products
    const productsToInsert = top20Products.map((p, idx) => ({
      producto_nombre: p.producto_nombre,
      imagen_url: p.imagen_url,
      producto_url: p.producto_url,
      categoria: p.categoria,
      precio_mxn: p.precio_mxn,
      price: p.price,
      commission: p.commission,
      total_ingresos_mxn: p.total_ingresos_mxn,
      total_ventas: p.total_ventas,
    }));

    console.log(`Insertando ${productsToInsert.length} productos...`);

    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("products")
      .insert(productsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting products:", insertError);
      throw new Error(`Error al insertar productos: ${insertError.message}`);
    }

    console.log(`${insertedData?.length || 0} productos insertados exitosamente`);

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
        processed: top20Products.length,
        total: rows.length,
        message: `Se importaron los Top ${top20Products.length} productos de ${rows.length} filas. Auto-matching ejecutado.`,
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
