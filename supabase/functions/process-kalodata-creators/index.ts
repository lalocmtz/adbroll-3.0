import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dynamic column mapping for Kalodata LIST_CREATOR files
const COLUMN_MAPPINGS: Record<string, string[]> = {
  creator_name: ["nombre del creador", "creator name", "creator", "nombre", "name", "nombre completo"],
  username: ["usuario del creador", "username", "handle", "usuario", "@", "creator handle", "tiktok handle"],
  avatar_url: ["profile image", "profile image url", "imagen", "avatar", "foto", "image url", "profile pic", "avatar url", "creator avatar url"],
  followers: ["seguidores", "followers", "follower count", "total followers", "creator_follower"],
  revenue_30d: ["ingresos(m$)", "ingresos", "revenue", "ingresos totales", "total revenue", "gmv", "total ingresos", "gmv 30d", "ingresos 30d", "revenue 30d", "creator_income_30d"],
  views_30d: ["visualizaciones", "views", "vistas", "content views", "total views", "vistas de contenido", "video views", "views 30d", "video_views_30d"],
  total_live_count: ["lives", "total lives", "live count", "total_live_count", "lives 30d", "transmisiones en vivo", "live streams", "live sessions"],
  gmv_live: ["gmv live", "gmv_live_m", "ventas live", "live gmv", "gmv por lives", "live sales", "ventas en vivo", "gmv live m", "live revenue"],
  revenue_live: ["ingresos en vivo", "live revenue", "revenue live", "ingresos live"],
  revenue_videos: ["ingresos por video", "video revenue", "revenue videos", "gmv videos", "ingresos videos"],
  tiktok_url: ["enlace de tiktok", "tiktok url", "url", "profile url", "enlace", "link", "creator url", "tiktok link"],
  country: ["country", "país", "region", "location"],
};

// Find matching column value dynamically
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

// Parse numeric values safely
function parseNumericValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  
  const str = String(value).replace(/[$,MXN\s%]/gi, "").trim();
  
  if (str.toLowerCase().includes("m")) {
    const numPart = parseFloat(str.replace(/[mM$]/g, ""));
    if (!isNaN(numPart)) return numPart * 1000000;
  }
  
  if (str.toLowerCase().includes("k")) {
    const numPart = parseFloat(str.replace(/[kK]/g, ""));
    if (!isNaN(numPart)) return numPart * 1000;
  }
  
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

// Build TikTok URL from username
function buildTikTokUrl(username: string, existingUrl: string | null): string | null {
  if (existingUrl && existingUrl.includes("tiktok.com")) {
    return existingUrl;
  }
  if (username) {
    const cleanUsername = username.replace("@", "").trim();
    return `https://www.tiktok.com/@${cleanUsername}`;
  }
  return null;
}

// Scrape TikTok avatar from profile page
async function scrapeTikTokAvatar(tiktokUrl: string): Promise<string | null> {
  try {
    console.log(`Scraping avatar from: ${tiktokUrl}`);
    
    const response = await fetch(tiktokUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch TikTok page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Try og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                         html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    
    if (ogImageMatch && ogImageMatch[1]) {
      console.log(`Found og:image`);
      return ogImageMatch[1];
    }

    // Try avatarLarger from JSON
    const avatarLargerMatch = html.match(/"avatarLarger"\s*:\s*"([^"]+)"/);
    if (avatarLargerMatch && avatarLargerMatch[1]) {
      const avatarUrl = avatarLargerMatch[1].replace(/\\u002F/g, "/");
      console.log(`Found avatarLarger`);
      return avatarUrl;
    }

    // Try avatarThumb
    const avatarThumbMatch = html.match(/"avatarThumb"\s*:\s*"([^"]+)"/);
    if (avatarThumbMatch && avatarThumbMatch[1]) {
      const avatarUrl = avatarThumbMatch[1].replace(/\\u002F/g, "/");
      console.log(`Found avatarThumb`);
      return avatarUrl;
    }

    return null;
  } catch (error) {
    console.error(`Error scraping avatar: ${error}`);
    return null;
  }
}

// Background task to fetch and update avatars
async function fetchAvatarsInBackground(
  creators: Array<{ id: string; tiktok_url: string | null; avatar_url: string | null }>,
  supabaseServiceClient: any
) {
  console.log(`Starting background avatar fetch for ${creators.length} creators...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const creator of creators) {
    // Skip if already has avatar URL
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      console.log(`Creator ${creator.id} already has avatar, skipping`);
      continue;
    }
    
    if (!creator.tiktok_url) {
      console.log(`Creator ${creator.id} has no TikTok URL, skipping`);
      continue;
    }
    
    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const avatarUrl = await scrapeTikTokAvatar(creator.tiktok_url);
      
      if (avatarUrl) {
        const { error } = await supabaseServiceClient
          .from("creators")
          .update({ avatar_url: avatarUrl })
          .eq("id", creator.id);
        
        if (error) {
          console.error(`Error updating avatar for ${creator.id}:`, error);
          failCount++;
        } else {
          console.log(`Updated avatar for creator ${creator.id}`);
          successCount++;
        }
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`Error fetching avatar for creator ${creator.id}:`, error);
      failCount++;
    }
  }
  
  console.log(`Background avatar fetch complete: ${successCount} success, ${failCount} failed`);
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
      console.log("Columnas detectadas:", JSON.stringify(Object.keys(rows[0])));
    }

    // Process each row with dynamic column detection
    const processedCreators = rows.map((row, index) => {
      const creatorName = findColumnValue(row, "creator_name");
      const username = findColumnValue(row, "username");
      const avatarUrl = findColumnValue(row, "avatar_url");
      const followers = parseNumericValue(findColumnValue(row, "followers"));
      const revenue30d = parseNumericValue(findColumnValue(row, "revenue_30d"));
      const views30d = parseNumericValue(findColumnValue(row, "views_30d"));
      const totalLiveCount = parseNumericValue(findColumnValue(row, "total_live_count"));
      const gmvLive = parseNumericValue(findColumnValue(row, "gmv_live"));
      const revenueLive = parseNumericValue(findColumnValue(row, "revenue_live"));
      const revenueVideos = parseNumericValue(findColumnValue(row, "revenue_videos"));
      const tiktokUrl = findColumnValue(row, "tiktok_url");
      const country = findColumnValue(row, "country");

      const finalUsername = username || creatorName || `creator_${index + 1}`;
      const cleanUsername = String(finalUsername).replace("@", "").trim();

      // Use gmv_live if available, otherwise fall back to revenue_live
      const finalGmvLive = gmvLive || revenueLive || 0;

      return {
        usuario_creador: cleanUsername,
        nombre_completo: creatorName ? String(creatorName).trim() : cleanUsername,
        creator_handle: cleanUsername,
        seguidores: followers ? Math.round(followers) : 0,
        total_ingresos_mxn: revenue30d || 0,
        total_ventas: 0,
        total_videos: 0,
        promedio_visualizaciones: views30d ? Math.round(views30d) : 0,
        promedio_roas: null,
        mejor_video_url: null,
        avatar_url: avatarUrl ? String(avatarUrl).trim() : null,
        likes_30d: 0, // Deprecated, keeping for backward compatibility
        total_live_count: totalLiveCount ? Math.round(totalLiveCount) : 0,
        gmv_live_mxn: finalGmvLive,
        revenue_live: revenueLive || 0,
        revenue_videos: revenueVideos || 0,
        tiktok_url: buildTikTokUrl(cleanUsername, tiktokUrl ? String(tiktokUrl).trim() : null),
        country: country ? String(country).trim() : null,
        last_import: new Date().toISOString(),
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
    }

    // Insert new creators
    console.log(`Insertando ${top50Creators.length} creadores...`);

    const { data: insertedData, error: insertError } = await supabaseServiceClient
      .from("creators")
      .insert(top50Creators)
      .select("id, tiktok_url, avatar_url");

    if (insertError) {
      console.error("Error inserting creators:", insertError);
      throw new Error(`Error al insertar creadores: ${insertError.message}`);
    }

    console.log(`${insertedData?.length || 0} creadores insertados exitosamente`);

    // Start background task to fetch avatars for creators without one
    if (insertedData && insertedData.length > 0) {
      const creatorsNeedingAvatars = insertedData.filter(
        c => !c.avatar_url || !c.avatar_url.startsWith("http")
      );
      
      if (creatorsNeedingAvatars.length > 0) {
        console.log(`Starting background avatar fetch for ${creatorsNeedingAvatars.length} creators`);
        
        // Use EdgeRuntime.waitUntil for background processing
        const globalRuntime = globalThis as unknown as { EdgeRuntime?: { waitUntil: (promise: Promise<void>) => void } };
        if (globalRuntime.EdgeRuntime?.waitUntil) {
          globalRuntime.EdgeRuntime.waitUntil(
            fetchAvatarsInBackground(creatorsNeedingAvatars, supabaseServiceClient)
          );
        } else {
          // Fallback: run synchronously for first few creators
          console.log("EdgeRuntime.waitUntil not available, fetching first 5 avatars synchronously");
          fetchAvatarsInBackground(creatorsNeedingAvatars.slice(0, 5), supabaseServiceClient);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: top50Creators.length,
        total: rows.length,
        message: `Se importaron los Top ${top50Creators.length} creadores. Los avatares se están descargando en segundo plano.`,
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
