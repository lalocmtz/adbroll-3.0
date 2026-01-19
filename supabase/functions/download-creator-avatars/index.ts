import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get creators that have avatar_url but no avatar_storage_url
    const { data: creators, error: fetchError } = await supabase
      .from("creators")
      .select("id, avatar_url, usuario_creador, nombre_completo")
      .not("avatar_url", "is", null)
      .is("avatar_storage_url", null)
      .limit(50); // Process in batches

    if (fetchError) {
      console.error("Error fetching creators:", fetchError);
      throw fetchError;
    }

    if (!creators || creators.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No creators need avatar processing",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${creators.length} creators...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const creator of creators) {
      try {
        if (!creator.avatar_url) continue;

        console.log(`Downloading avatar for ${creator.usuario_creador}...`);

        // Download image from TikTok CDN (server-side bypasses CORS)
        const imageResponse = await fetch(creator.avatar_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!imageResponse.ok) {
          console.error(`Failed to download avatar for ${creator.usuario_creador}: ${imageResponse.status}`);
          errors.push(`${creator.usuario_creador}: HTTP ${imageResponse.status}`);
          errorCount++;
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        
        // Determine file extension
        let extension = "jpg";
        if (contentType.includes("png")) extension = "png";
        else if (contentType.includes("webp")) extension = "webp";
        else if (contentType.includes("gif")) extension = "gif";

        const fileName = `creator-avatars/${creator.id}.${extension}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(fileName, imageBlob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Failed to upload avatar for ${creator.usuario_creador}:`, uploadError);
          errors.push(`${creator.usuario_creador}: Upload failed - ${uploadError.message}`);
          errorCount++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("assets")
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // Update creator with permanent URL
        const { error: updateError } = await supabase
          .from("creators")
          .update({ avatar_storage_url: publicUrl })
          .eq("id", creator.id);

        if (updateError) {
          console.error(`Failed to update creator ${creator.usuario_creador}:`, updateError);
          errors.push(`${creator.usuario_creador}: DB update failed - ${updateError.message}`);
          errorCount++;
          continue;
        }

        console.log(`Successfully processed ${creator.usuario_creador}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing ${creator.usuario_creador}:`, err);
        errors.push(`${creator.usuario_creador}: ${errorMessage}`);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${creators.length} creators`,
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Only return first 10 errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in download-creator-avatars:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
