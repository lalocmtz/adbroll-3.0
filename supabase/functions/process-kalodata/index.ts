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
    
    const mp4Url = rapidApiData.data?.hdplay || 
                   rapidApiData.data?.play || 
                   rapidApiData.data?.wmplay;

    if (!mp4Url) {
      console.error(`[download] No MP4 URL for ${videoId}`);
      await supabase.from('videos').update({ processing_status: 'no_mp4_url' }).eq('id', videoId);
      return false;
    }

    const videoResponse = await fetch(mp4Url);
    if (!videoResponse.ok) {
      await supabase.from('videos').update({ processing_status: 'download_failed' }).eq('id', videoId);
      return false;
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log(`[download] Video ${videoId} downloaded, size: ${videoBuffer.byteLength} bytes`);

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

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY") ?? "";

    const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const market = formData.get("market") as string || "mx";
    
    if (!file) throw new Error("No se proporcionó archivo");

    console.log("Archivo recibido:", file.name, "Tamaño:", file.size, "Market:", market);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel para mercado ${market}`);

    // Sort by revenue
    const sortedRows = rows.sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"]);

    // Load all products for matching (filtered by market)
    const { data: products } = await supabaseServiceClient
      .from("products")
      .select("id, producto_nombre, producto_url, price, total_ventas, total_ingresos_mxn")
      .eq("market", market);

    console.log(`Loaded ${products?.length || 0} products for matching (market: ${market})`);

    // Load all creators for matching (filtered by market)
    const { data: creators } = await supabaseServiceClient
      .from("creators")
      .select("id, creator_handle")
      .eq("country", market);

    console.log(`Loaded ${creators?.length || 0} creators for matching (market: ${market})`);

    // Advanced product matching function
    const calculateMatchScore = (videoText: string, productName: string): number => {
      if (!videoText || !productName) return 0;
      
      const v = videoText.toLowerCase().trim();
      const p = productName.toLowerCase().trim();
      
      if (v === p) return 1.0;
      
      // Remove emojis and special chars
      const clean = (s: string) => s
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[^\w\sáéíóúñü]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const vClean = clean(v);
      const pClean = clean(p);
      
      // Direct containment
      if (vClean.includes(pClean) || pClean.includes(vClean)) return 0.9;
      
      // Extract keywords
      const stopWords = ['de', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'con', 'y', 'en', 'a', 'del', 'al', 'por'];
      const extractWords = (s: string) => s.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
      
      const pWords = extractWords(pClean);
      const vWords = extractWords(vClean);
      
      if (pWords.length === 0) return 0;
      
      let matched = 0;
      for (const pw of pWords) {
        for (const vw of vWords) {
          if (pw === vw || (pw.length >= 4 && vw.length >= 4 && (pw.includes(vw) || vw.includes(pw)))) {
            matched++;
            break;
          }
        }
      }
      
      return matched / pWords.length;
    };

    const findBestProductMatch = (videoTitle: string, products: any[]): any | null => {
      let bestMatch = null;
      let bestScore = 0;
      
      for (const p of products) {
        const score = calculateMatchScore(videoTitle, p.producto_nombre);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = p;
        }
      }
      
      return bestMatch;
    };

    // Process videos with smart upsert
    const newlyInsertedVideos: { id: string; video_url: string }[] = [];
    let updatedCount = 0;
    let insertedCount = 0;

    for (let idx = 0; idx < sortedRows.length; idx++) {
      const row = sortedRows[idx];
      const videoUrl = row["Enlace de TikTok"];
      const videoTitle = row["Descripción del vídeo"]?.toLowerCase() || "";
      const creatorHandle = row["Usuario del creador"] || null;
      const rank = idx + 1;

      // Match product using advanced scoring
      const matchedProduct = findBestProductMatch(videoTitle, products || []);

      // Match creator by handle
      let matchedCreator = null;
      if (creators && creators.length > 0 && creatorHandle) {
        const normalizedHandle = creatorHandle.replace("@", "").toLowerCase().trim();
        matchedCreator = creators.find((c) => {
          const cHandle = (c.creator_handle || "").toLowerCase().trim();
          return cHandle === normalizedHandle;
        });
      }

      // Check if video exists by video_url
      const { data: existing } = await supabaseServiceClient
        .from("videos")
        .select("id, video_mp4_url")
        .eq("video_url", videoUrl)
        .maybeSingle();

      const videoMetrics = {
        rank,
        title: row["Descripción del vídeo"],
        creator_name: row["Usuario del creador"],
        creator_handle: row["Usuario del creador"],
        creator_id: matchedCreator?.id || null,
        product_name: matchedProduct?.producto_nombre || null,
        product_id: matchedProduct?.id || null,
        product_price: matchedProduct?.price || null,
        product_sales: matchedProduct?.total_ventas || null,
        product_revenue: matchedProduct?.total_ingresos_mxn || null,
        sales: row["Ventas"],
        revenue_mxn: row["Ingresos (M$)"],
        views: row["Visualizaciones"],
        roas: row["ROAS - Retorno de la inversión publicitaria"],
        country: market,
      };

      if (existing) {
        // UPDATE existing video - only update metrics, DO NOT re-download MP4
        const { error: updateError } = await supabaseServiceClient
          .from("videos")
          .update({
            ...videoMetrics,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (!updateError) {
          updatedCount++;
          console.log(`Updated video: ${videoUrl.substring(0, 50)}...`);
          
          // If video doesn't have MP4 yet, queue for download
          if (!existing.video_mp4_url) {
            newlyInsertedVideos.push({ id: existing.id, video_url: videoUrl });
          }
        } else {
          console.error(`Error updating video:`, updateError);
        }
      } else {
        // INSERT new video
        const { data: inserted, error: insertError } = await supabaseServiceClient
          .from("videos")
          .insert({
            video_url: videoUrl,
            ...videoMetrics,
            processing_status: 'pending',
            category: null,
            imported_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!insertError && inserted) {
          insertedCount++;
          newlyInsertedVideos.push({ id: inserted.id, video_url: videoUrl });
          console.log(`Inserted video: ${videoUrl.substring(0, 50)}...`);
        } else {
          console.error(`Error inserting video:`, insertError);
        }
      }
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated`);
    console.log(`${newlyInsertedVideos.length} videos queued for MP4 download`);

    // Start background downloads if we have RapidAPI key
    if (rapidApiKey && newlyInsertedVideos.length > 0) {
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
        processed: sortedRows.length,
        total: sortedRows.length,
        downloads_queued: newlyInsertedVideos.length,
        market,
        message: `Importación inteligente (${market.toUpperCase()}): ${insertedCount} nuevos, ${updatedCount} actualizados. ${newlyInsertedVideos.length} videos en cola para descarga.`,
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
