import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;

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

// Function to download a single video
async function downloadSingleVideo(
  videoId: string,
  tiktokUrl: string,
  rapidApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  try {
    console.log(`[download] Starting download for video ${videoId}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call RapidAPI TikTok Video No Watermark API
    const rapidApiResponse = await fetch(
      `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(tiktokUrl)}&hd=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com'
        }
      }
    );

    if (!rapidApiResponse.ok) {
      console.error(`[download] RapidAPI error for ${videoId}`);
      await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
      return false;
    }

    const rapidApiData = await rapidApiResponse.json();
    
    // Extract MP4 URL
    const mp4Url = rapidApiData.data?.hdplay || 
                   rapidApiData.data?.play || 
                   rapidApiData.data?.wmplay;

    if (!mp4Url) {
      console.error(`[download] No MP4 URL for ${videoId}`);
      await supabase.from('videos').update({ processing_status: 'no_mp4_url' }).eq('id', videoId);
      return false;
    }

    // Download the video
    const videoResponse = await fetch(mp4Url);
    if (!videoResponse.ok) {
      await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
      return false;
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download] Video ${videoId} downloaded, size: ${videoBuffer.byteLength} bytes`);

    // Upload to Supabase Storage
    const fileName = `${videoId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error(`[download] Upload error for ${videoId}:`, uploadError);
      await supabase.from('videos').update({ processing_status: 'upload_failed' }).eq('id', videoId);
      return false;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    // Update database
    await supabase
      .from('videos')
      .update({ 
        video_mp4_url: publicUrlData.publicUrl,
        processing_status: 'downloaded'
      })
      .eq('id', videoId);

    console.log(`[download] ✓ Video ${videoId} completed`);
    return true;

  } catch (error) {
    console.error(`[download] Error for ${videoId}:`, error);
    return false;
  }
}

// Background task to download all videos
async function downloadVideosInBackground(
  videoIds: { id: string; video_url: string }[],
  rapidApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  console.log(`[background] Starting download of ${videoIds.length} videos`);
  
  let successCount = 0;
  let failCount = 0;

  // Process videos sequentially with delay to avoid rate limits
  for (const video of videoIds) {
    const success = await downloadSingleVideo(
      video.id,
      video.video_url,
      rapidApiKey,
      supabaseUrl,
      supabaseServiceKey
    );

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Wait 2 seconds between downloads to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`[background] Download complete: ${successCount} success, ${failCount} failed`);
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";

    const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);

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

    // Helper function to normalize product names
    const normalizeProductName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Process videos and track newly inserted ones for downloading
    const newlyInsertedVideos: { id: string; video_url: string }[] = [];
    let upsertedCount = 0;
    let updatedCount = 0;
    let insertedCount = 0;

    for (const row of sortedRows) {
      const videoUrl = row["Enlace de TikTok"];
      const videoTitle = row["Descripción del vídeo"]?.toLowerCase() || "";

      // Try to match product
      let matchedProduct = null;
      if (products && products.length > 0) {
        const normalizedVideoTitle = normalizeProductName(videoTitle);
        
        matchedProduct = products.find((p) => {
          const pName = normalizeProductName(p.producto_nombre || "");
          return normalizedVideoTitle.includes(pName) || pName.includes(normalizedVideoTitle);
        });
      }

      const videoData = {
        video_url: videoUrl,
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
        processing_status: 'pending',
      };

      // Check if video exists by video_url
      const { data: existing } = await supabaseServiceClient
        .from("videos")
        .select("id, video_mp4_url")
        .eq("video_url", videoUrl)
        .maybeSingle();

      if (existing) {
        // UPDATE: only update metrics
        await supabaseServiceClient
          .from("videos")
          .update({
            rank: videoData.rank,
            revenue_mxn: videoData.revenue_mxn,
            sales: videoData.sales,
            views: videoData.views,
            roas: videoData.roas,
            product_id: videoData.product_id,
            product_price: videoData.product_price,
            product_sales: videoData.product_sales,
            product_revenue: videoData.product_revenue,
          })
          .eq("id", existing.id);

        updatedCount++;

        // If video doesn't have MP4 yet, add to download queue
        if (!existing.video_mp4_url) {
          newlyInsertedVideos.push({ id: existing.id, video_url: videoUrl });
        }
      } else {
        // INSERT: new video
        const { data: inserted, error: insertError } = await supabaseServiceClient
          .from("videos")
          .insert(videoData)
          .select("id")
          .single();

        if (!insertError && inserted) {
          insertedCount++;
          newlyInsertedVideos.push({ id: inserted.id, video_url: videoUrl });
        } else {
          console.error(`Error inserting video ${videoUrl}:`, insertError);
        }
      }
      
      upsertedCount++;
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated`);
    console.log(`${newlyInsertedVideos.length} videos queued for MP4 download`);

    // Start background downloads if we have RapidAPI key
    if (rapidApiKey && newlyInsertedVideos.length > 0) {
      // Use EdgeRuntime.waitUntil for background processing
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(
          downloadVideosInBackground(
            newlyInsertedVideos,
            rapidApiKey,
            supabaseUrl,
            supabaseServiceKey
          )
        );
        console.log("Background download task started");
      } else {
        // Fallback: download first 5 videos synchronously
        console.log("EdgeRuntime not available, downloading first 5 videos synchronously");
        for (let i = 0; i < Math.min(5, newlyInsertedVideos.length); i++) {
          await downloadSingleVideo(
            newlyInsertedVideos[i].id,
            newlyInsertedVideos[i].video_url,
            rapidApiKey,
            supabaseUrl,
            supabaseServiceKey
          );
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        processed: upsertedCount,
        total: sortedRows.length,
        downloads_queued: newlyInsertedVideos.length,
        message: `Successfully processed ${upsertedCount} videos: ${insertedCount} new, ${updatedCount} updated. ${newlyInsertedVideos.length} videos queued for MP4 download.`,
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
