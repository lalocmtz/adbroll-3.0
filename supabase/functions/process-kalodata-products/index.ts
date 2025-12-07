import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Column mapping - maps various possible column names to our internal fields
const COLUMN_MAPPINGS: Record<string, string[]> = {
  rank: ["#", "rank", "ranking", "posición", "position"],
  name: ["product name", "nombre del producto", "product", "nombre", "name"],
  image_url: ["main image", "imagen url", "image", "imagen", "image url", "product image", "enlace de la imagen"],
  product_url: ["product url", "url del producto", "url", "link", "product link", "enlace de tiktok", "tiktok url"],
  category_raw: ["category", "categoría", "categoria"],
  price: ["price (mxn)", "precio (m$)", "precio", "price", "precio mxn", "precio medio por unidad(m$)"],
  commission_rate: ["commission %", "comisión %", "commission", "comision", "comisión", "tasa de comisión", "commission rate"],
  commission_amount: ["commission (mxn)", "comisión (mxn)", "comision mxn", "commission amount"],
  revenue_30d: ["gmv 30d", "ingresos 30d", "revenue 30d", "gmv", "ingresos(m$)", "ingresos", "revenue", "gmv 7d", "ingresos 7d", "revenue 7d"],
  sales_30d: ["orders 30d", "ventas 30d", "sales 30d", "orders 30 days", "pedidos 30d", "ventas", "orders", "sales", "orders 7d", "ventas 7d", "sales 7d"],
  creators_count: ["creators active", "creadores activos", "active creators", "creators", "número de creadores", "creators count"],
  rating: ["rating", "calificación", "calificaciones del producto", "product rating"],
};

function findColumnValue(row: Record<string, any>, fieldName: string): any {
  const possibleNames = COLUMN_MAPPINGS[fieldName] || [];
  
  for (const colName of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim() === colName.toLowerCase()) {
        return row[key];
      }
    }
  }
  
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

function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  
  const str = String(value).replace(/[$,MXN\s]/gi, "").trim();
  
  if (str.includes("-") && !str.startsWith("-")) {
    const parts = str.split("-");
    const num1 = parseFloat(parts[0]);
    const num2 = parseFloat(parts[1]);
    if (!isNaN(num1) && !isNaN(num2)) {
      return (num1 + num2) / 2;
    }
  }
  
  const cleanValue = str.replace("%", "").trim();
  const num = parseFloat(cleanValue);
  return isNaN(num) ? null : num;
}

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("No autenticado");

    console.log("Usuario autenticado:", user.email);

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

    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const market = formData.get("market") as string || "mx";
    
    if (!file) throw new Error("No se proporcionó archivo");

    console.log("Archivo de productos recibido:", file.name, "Tamaño:", file.size, "Market:", market);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel para mercado ${market}`);
    
    if (rows.length > 0) {
      console.log("Columnas detectadas:", Object.keys(rows[0]));
    }

    // Process each row
    const processedProducts = rows.map((row, index) => {
      const rank = parseNumericValue(findColumnValue(row, "rank")) || index + 1;
      const name = findColumnValue(row, "name");
      const imageUrl = findColumnValue(row, "image_url");
      const productUrl = findColumnValue(row, "product_url");
      const categoryRaw = findColumnValue(row, "category_raw");
      const price = parseNumericValue(findColumnValue(row, "price"));
      const commissionRate = parseNumericValue(findColumnValue(row, "commission_rate"));
      let commissionAmount = parseNumericValue(findColumnValue(row, "commission_amount"));
      const revenue30d = parseNumericValue(findColumnValue(row, "revenue_30d"));
      const sales30d = parseNumericValue(findColumnValue(row, "sales_30d"));
      const creatorsCount = parseNumericValue(findColumnValue(row, "creators_count"));
      const rating = parseNumericValue(findColumnValue(row, "rating"));

      if (!commissionAmount && price && commissionRate) {
        commissionAmount = price * (commissionRate / 100);
      }
      
      const categoryShort = extractShortCategory(categoryRaw);

      return {
        name: name ? String(name).trim() : null,
        image_url: imageUrl || null,
        product_url: productUrl || null,
        category: categoryShort,
        price,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        revenue_30d: revenue30d || 0,
        sales_30d: sales30d ? Math.round(sales30d) : 0,
        creators_count: creatorsCount,
        rating,
      };
    }).filter(p => p.name);

    console.log(`Productos procesados: ${processedProducts.length}`);

    // Sort by revenue_30d descending
    const sortedProducts = processedProducts.sort((a, b) => {
      const aValue = a.revenue_30d || a.sales_30d || 0;
      const bValue = b.revenue_30d || b.sales_30d || 0;
      return bValue - aValue;
    });

    // SMART UPSERT: Check existing products by name AND market
    let insertedCount = 0;
    let updatedCount = 0;

    for (let idx = 0; idx < sortedProducts.length; idx++) {
      const p = sortedProducts[idx];
      const rank = idx + 1;

      // Check if product exists by name AND market
      const { data: existing } = await supabaseServiceClient
        .from("products")
        .select("id")
        .eq("producto_nombre", p.name)
        .eq("market", market)
        .maybeSingle();

      const productData = {
        rank,
        producto_nombre: p.name,
        imagen_url: p.image_url,
        producto_url: p.product_url,
        categoria: p.category,
        precio_mxn: p.price,
        price: p.price,
        commission: p.commission_rate,
        commission_amount: p.commission_amount,
        revenue_30d: p.revenue_30d,
        total_ingresos_mxn: p.revenue_30d,
        sales_7d: p.sales_30d,
        total_ventas: p.sales_30d,
        creators_count: p.creators_count,
        rating: p.rating,
        market,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // UPDATE existing product - only update metrics and rank
        const { error: updateError } = await supabaseServiceClient
          .from("products")
          .update({
            rank: productData.rank,
            imagen_url: productData.imagen_url,
            precio_mxn: productData.precio_mxn,
            price: productData.price,
            commission: productData.commission,
            commission_amount: productData.commission_amount,
            revenue_30d: productData.revenue_30d,
            total_ingresos_mxn: productData.total_ingresos_mxn,
            sales_7d: productData.sales_7d,
            total_ventas: productData.total_ventas,
            creators_count: productData.creators_count,
            rating: productData.rating,
            updated_at: productData.updated_at,
          })
          .eq("id", existing.id);

        if (!updateError) {
          updatedCount++;
          console.log(`Updated product: ${p.name}`);
        } else {
          console.error(`Error updating product ${p.name}:`, updateError);
        }
      } else {
        // INSERT new product with market
        const { error: insertError } = await supabaseServiceClient
          .from("products")
          .insert(productData);

        if (!insertError) {
          insertedCount++;
          console.log(`Inserted product: ${p.name} (market: ${market})`);
        } else {
          console.error(`Error inserting product ${p.name}:`, insertError);
        }
      }
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated (market: ${market})`);

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
        processed: sortedProducts.length,
        total: rows.length,
        market,
        message: `Importación inteligente (${market.toUpperCase()}): ${insertedCount} nuevos, ${updatedCount} actualizados de ${rows.length} filas.`,
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
