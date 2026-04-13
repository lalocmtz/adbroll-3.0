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
    const sortedRows = rows.sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"]);

    // Load all products to match against
    const { data: products, error: productsError } = await supabaseServiceClient
      .from("products")
      .select("id, producto_nombre, producto_url, price, total_ventas, total_ingresos_mxn");

    if (productsError) {
      console.error("Error loading products:", productsError);
    }

    console.log(`Loaded ${products?.length || 0} products for matching`);

    // Map videos and match with products
    const sortedVideos = await Promise.all(
      sortedRows.map(async (row) => {
        let matchedProduct = null;

        // Try to match product by name or URL
        if (products && products.length > 0) {
          const videoTitle = row["Descripción del vídeo"]?.toLowerCase() || "";
          
          matchedProduct = products.find((p) => {
            const productName = p.producto_nombre?.toLowerCase() || "";
            // Simple matching: if video title contains product name
            return productName && videoTitle.includes(productName);
          });
        }

        // Count total videos for this product
        let totalVideosOfProduct = 1;
        if (matchedProduct) {
          const { count } = await supabaseServiceClient
            .from("videos")
            .select("*", { count: "exact", head: true })
            .eq("product_id", matchedProduct.id);
          
          totalVideosOfProduct = (count || 0) + 1; // +1 for this new video
        }

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
          product_name: matchedProduct?.producto_nombre || null,
          product_id: matchedProduct?.id || null,
          product_price: matchedProduct?.price || null,
          product_sales: matchedProduct?.total_ventas || null,
          product_revenue: matchedProduct?.total_ingresos_mxn || null,
        };
      })
    );

    console.log(`Procesando ${sortedVideos.length} videos con UPSERT...`);

    // Helper function to normalize product names
    const normalizeProductName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
        .replace(/\([^)]*\)/g, '') // Remove text in parentheses
        .replace(/\[[^\]]*\]/g, '') // Remove text in brackets
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    };

    // UPSERT videos one by one (because we need product matching per video)
    let upsertedCount = 0;
    let updatedCount = 0;
    let insertedCount = 0;

    for (const video of sortedVideos) {
      // Try to match product using normalized name
      let matchedProduct = null;
      if (video.product_name && products && products.length > 0) {
        const normalizedVideoTitle = normalizeProductName(video.title || "");
        const normalizedProductName = normalizeProductName(video.product_name);
        
        matchedProduct = products.find((p) => {
          const pName = normalizeProductName(p.producto_nombre || "");
          // Check if video title or product name contains the other
          return normalizedVideoTitle.includes(pName) || 
                 pName.includes(normalizedProductName) ||
                 normalizedProductName.includes(pName);
        });

        if (matchedProduct) {
          console.log(`Matched product "${matchedProduct.producto_nombre}" for video "${video.title}"`);
          video.product_id = matchedProduct.id;
          video.product_price = matchedProduct.price || null;
          video.product_sales = matchedProduct.total_ventas || null;
          video.product_revenue = matchedProduct.total_ingresos_mxn || null;
        }
      }

      // Check if video exists by video_url
      const { data: existing } = await supabaseServiceClient
        .from("videos")
        .select("id")
        .eq("video_url", video.video_url)
        .maybeSingle();

      if (existing) {
        // UPDATE: only update metrics and rank
        const { error: updateError } = await supabaseServiceClient
          .from("videos")
          .update({
            rank: video.rank,
            revenue_mxn: video.revenue_mxn,
            sales: video.sales,
            views: video.views,
            roas: video.roas,
            product_id: video.product_id,
            product_price: video.product_price,
            product_sales: video.product_sales,
            product_revenue: video.product_revenue,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(`Error updating video ${video.video_url}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        // INSERT: new video
        const { error: insertError } = await supabaseServiceClient
          .from("videos")
          .insert(video);

        if (insertError) {
          console.error(`Error inserting video ${video.video_url}:`, insertError);
        } else {
          insertedCount++;
        }
      }
      
      upsertedCount++;
    }


    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        processed: upsertedCount,
        total: sortedVideos.length,
        message: `Successfully processed ${upsertedCount} videos: ${insertedCount} new, ${updatedCount} updated.`,
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
