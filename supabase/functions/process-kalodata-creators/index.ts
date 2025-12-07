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

const COLUMN_MAPPINGS: Record<string, string[]> = {
  creator_name: ["nombre del creador", "creator name", "creator", "nombre", "name", "nombre completo", "nickname"],
  username: ["usuario del creador", "username", "handle", "usuario", "@", "creator handle", "tiktok handle"],
  avatar_url: ["profile image", "profile image url", "imagen", "avatar", "foto", "image url", "profile pic", "avatar url", "creator avatar url"],
  followers: ["seguidores", "followers", "follower count", "total followers", "creator_follower"],
  revenue_30d: ["ingresos(m$)", "ingresos", "revenue", "ingresos totales", "total revenue", "gmv", "total ingresos", "gmv 30d", "ingresos 30d", "revenue 30d", "creator_income_30d"],
  views_30d: ["visualizaciones", "views", "vistas", "content views", "total views", "vistas de contenido", "video views", "views 30d", "video_views_30d", "vistas 30d"],
  total_live_count: ["número de transmisiones en vivo", "lives", "total lives", "live count", "total_live_count", "lives 30d", "transmisiones en vivo", "live streams", "live sessions"],
  gmv_live: ["gmv en vivo(m$)", "gmv live", "gmv_live_m", "ventas live", "live gmv", "gmv por lives", "live sales", "ventas en vivo", "gmv live m", "live revenue"],
  videos_count: ["número de videos", "videos count", "total videos", "videos", "video count"],
  gmv_videos: ["gmv por videos(m$)", "gmv por vídeos(m$)", "gmv videos", "video gmv", "gmv por videos", "video sales", "ventas por videos"],
  tiktok_url: ["enlace de tiktok", "tiktok url", "url", "profile url", "enlace", "link", "creator url", "tiktok link"],
  country: ["country", "país", "region", "location"],
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

// Background task to fetch and update avatars
async function fetchAvatarsInBackground(
  creators: Array<{ id: string; tiktok_url: string | null; avatar_url: string | null }>,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  console.log(`Starting background avatar fetch for ${creators.length} creators...`);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let successCount = 0;
  let failCount = 0;
  
  for (const creator of creators) {
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      continue;
    }
    
    if (!creator.tiktok_url) {
      continue;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(creator.tiktok_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        failCount++;
        continue;
      }

      const html = await response.text();
      
      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                           html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
      
      let avatarUrl = null;
      if (ogImageMatch && ogImageMatch[1]) {
        avatarUrl = ogImageMatch[1];
      } else {
        const avatarLargerMatch = html.match(/"avatarLarger"\s*:\s*"([^"]+)"/);
        if (avatarLargerMatch && avatarLargerMatch[1]) {
          avatarUrl = avatarLargerMatch[1].replace(/\\u002F/g, "/");
        }
      }
      
      if (avatarUrl) {
        await supabase
          .from("creators")
          .update({ avatar_url: avatarUrl })
          .eq("id", creator.id);
        successCount++;
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
    const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const market = formData.get("market") as string || "mx";
    
    if (!file) throw new Error("No se proporcionó archivo");

    console.log("Archivo de creadores recibido:", file.name, "Tamaño:", file.size, "Market:", market);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procesando ${rows.length} filas del Excel para mercado ${market}`);
    
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
      const videosCount = parseNumericValue(findColumnValue(row, "videos_count"));
      const gmvVideos = parseNumericValue(findColumnValue(row, "gmv_videos"));
      const tiktokUrl = findColumnValue(row, "tiktok_url");

      const finalUsername = username || creatorName || `creator_${index + 1}`;
      const cleanUsername = String(finalUsername).replace("@", "").trim();

      return {
        handle: cleanUsername,
        usuario_creador: cleanUsername,
        nombre_completo: creatorName ? String(creatorName).trim() : cleanUsername,
        creator_handle: cleanUsername,
        seguidores: followers ? Math.round(followers) : 0,
        total_ingresos_mxn: revenue30d || 0,
        total_ventas: 0,
        total_videos: videosCount ? Math.round(videosCount) : 0,
        promedio_visualizaciones: views30d ? Math.round(views30d) : 0,
        promedio_roas: null,
        mejor_video_url: null,
        avatar_url: avatarUrl ? String(avatarUrl).trim() : null,
        likes_30d: 0,
        total_live_count: totalLiveCount ? Math.round(totalLiveCount) : 0,
        gmv_live_mxn: gmvLive || 0,
        revenue_live: gmvLive || 0,
        revenue_videos: gmvVideos || 0,
        tiktok_url: buildTikTokUrl(cleanUsername, tiktokUrl ? String(tiktokUrl).trim() : null),
        country: market, // Always use market from request body
      };
    }).filter(c => c.handle && c.handle !== "creator_0");

    console.log(`Creadores procesados: ${processedCreators.length}`);

    // Sort by revenue descending and take Top 50
    const sortedCreators = processedCreators.sort((a, b) => {
      return (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0);
    });

    const top50Creators = sortedCreators.slice(0, 50);
    console.log(`Top 50 creadores seleccionados (market: ${market})`);

    // SMART UPSERT: Check existing creators by handle AND market
    let insertedCount = 0;
    let updatedCount = 0;
    const creatorsForAvatarFetch: Array<{ id: string; tiktok_url: string | null; avatar_url: string | null }> = [];

    for (const c of top50Creators) {
      // Check if creator exists by handle AND market
      const { data: existing } = await supabaseServiceClient
        .from("creators")
        .select("id, avatar_url")
        .eq("creator_handle", c.handle)
        .eq("country", market)
        .maybeSingle();

      if (existing) {
        // UPDATE existing creator - only update followers and avatar if new
        const updateData: any = {
          seguidores: c.seguidores,
          total_ingresos_mxn: c.total_ingresos_mxn,
          total_videos: c.total_videos,
          promedio_visualizaciones: c.promedio_visualizaciones,
          total_live_count: c.total_live_count,
          gmv_live_mxn: c.gmv_live_mxn,
          revenue_live: c.revenue_live,
          revenue_videos: c.revenue_videos,
          updated_at: new Date().toISOString(),
          last_import: new Date().toISOString(),
        };

        // Only update avatar if we have a new one and existing doesn't have one
        if (c.avatar_url && (!existing.avatar_url || !existing.avatar_url.startsWith("http"))) {
          updateData.avatar_url = c.avatar_url;
        }

        const { error: updateError } = await supabaseServiceClient
          .from("creators")
          .update(updateData)
          .eq("id", existing.id);

        if (!updateError) {
          updatedCount++;
          console.log(`Updated creator: ${c.handle}`);
          
          // Queue for avatar fetch if still missing
          if (!existing.avatar_url && !c.avatar_url) {
            creatorsForAvatarFetch.push({ id: existing.id, tiktok_url: c.tiktok_url, avatar_url: null });
          }
        } else {
          console.error(`Error updating creator ${c.handle}:`, updateError);
        }
      } else {
        // INSERT new creator with market
        const { data: inserted, error: insertError } = await supabaseServiceClient
          .from("creators")
          .insert({
            ...c,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_import: new Date().toISOString(),
          })
          .select("id, tiktok_url, avatar_url")
          .single();

        if (!insertError && inserted) {
          insertedCount++;
          console.log(`Inserted creator: ${c.handle} (market: ${market})`);
          
          // Queue for avatar fetch if missing
          if (!inserted.avatar_url) {
            creatorsForAvatarFetch.push({ id: inserted.id, tiktok_url: inserted.tiktok_url, avatar_url: null });
          }
        } else {
          console.error(`Error inserting creator ${c.handle}:`, insertError);
        }
      }
    }

    console.log(`UPSERT completed: ${insertedCount} inserted, ${updatedCount} updated (market: ${market})`);

    // Start background task to fetch avatars
    if (creatorsForAvatarFetch.length > 0) {
      console.log(`Starting background avatar fetch for ${creatorsForAvatarFetch.length} creators`);
      
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(
          fetchAvatarsInBackground(creatorsForAvatarFetch, supabaseUrl, supabaseServiceKey)
        );
      } else {
        // Fallback: fetch first 5 synchronously
        await fetchAvatarsInBackground(creatorsForAvatarFetch.slice(0, 5), supabaseUrl, supabaseServiceKey);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        processed: top50Creators.length,
        total: rows.length,
        market,
        message: `Importación inteligente (${market.toUpperCase()}): ${insertedCount} nuevos, ${updatedCount} actualizados. Avatares descargándose en segundo plano.`,
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
