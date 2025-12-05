import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract avatar URL from TikTok profile page
async function fetchTikTokAvatar(tiktokUrl: string): Promise<string | null> {
  try {
    console.log(`Fetching avatar from: ${tiktokUrl}`);
    
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
    
    // Try to extract og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                         html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    
    if (ogImageMatch && ogImageMatch[1]) {
      console.log(`Found og:image: ${ogImageMatch[1]}`);
      return ogImageMatch[1];
    }

    // Try to extract avatarLarger from JSON data
    const avatarLargerMatch = html.match(/"avatarLarger"\s*:\s*"([^"]+)"/);
    if (avatarLargerMatch && avatarLargerMatch[1]) {
      const avatarUrl = avatarLargerMatch[1].replace(/\\u002F/g, "/");
      console.log(`Found avatarLarger: ${avatarUrl}`);
      return avatarUrl;
    }

    // Try avatarThumb
    const avatarThumbMatch = html.match(/"avatarThumb"\s*:\s*"([^"]+)"/);
    if (avatarThumbMatch && avatarThumbMatch[1]) {
      const avatarUrl = avatarThumbMatch[1].replace(/\\u002F/g, "/");
      console.log(`Found avatarThumb: ${avatarUrl}`);
      return avatarUrl;
    }

    console.log("No avatar found in page");
    return null;
  } catch (error) {
    console.error(`Error fetching avatar: ${error}`);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tiktok_url, creator_id } = await req.json();

    if (!tiktok_url) {
      return new Response(
        JSON.stringify({ error: "TikTok URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL
    let normalizedUrl = tiktok_url;
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://www.tiktok.com/@${tiktok_url.replace("@", "")}`;
    }

    const avatarUrl = await fetchTikTokAvatar(normalizedUrl);

    // If creator_id is provided, update the database
    if (creator_id && avatarUrl) {
      const supabaseServiceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error: updateError } = await supabaseServiceClient
        .from("creators")
        .update({ avatar_url: avatarUrl })
        .eq("id", creator_id);

      if (updateError) {
        console.error("Error updating creator avatar:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatar_url: avatarUrl,
        message: avatarUrl ? "Avatar found" : "No avatar found"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in fetch-creator-avatar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
