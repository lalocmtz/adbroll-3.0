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

    // Sort by revenue and take top 20
    const top20 = rows
      .sort((a, b) => b["Ingresos (M$)"] - a["Ingresos (M$)"])
      .slice(0, 20);

    console.log(`Top 20 seleccionados, actualizando featured_today...`);

    // Mark all existing videos as not featured
    const { error: unfeaturedError } = await supabaseServiceClient
      .from("daily_feed")
      .update({ featured_today: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (unfeaturedError) {
      throw new Error(`Error al actualizar featured_today: ${unfeaturedError.message}`);
    }

    console.log("Videos marcados como no destacados, procesando top 20...");

    // Map and validate rows
    const validRows = top20.map((row) => {
      let ratioAds: number | null = null;
      const ratioValue = row["Ratio de visualizaciones de Ads"] as string | number;
      if (typeof ratioValue === "string" && (ratioValue as string).includes("%")) {
        ratioAds = parseFloat((ratioValue as string).replace("%", ""));
      } else if (typeof ratioValue === "number") {
        ratioAds = ratioValue;
      }

      return {
        rango_fechas: row["Rango de fechas"],
        descripcion_video: row["Descripción del vídeo"],
        duracion: row["Duración"],
        creador: row["Usuario del creador"],
        fecha_publicacion: row["Fecha de publicación"],
        ingresos_mxn: row["Ingresos (M$)"],
        ventas: row["Ventas"],
        visualizaciones: row["Visualizaciones"],
        gpm_mxn: row["GPM (M$) - Ingresos brutos por cada mil visualizaciones"],
        cpa_mxn: row["CPA (M$) - Coste por acción"],
        ratio_ads: ratioAds,
        coste_publicitario_mxn: row["Coste publicitario (M$)"],
        roas: row["ROAS - Retorno de la inversión publicitaria"],
        tiktok_url: row["Enlace de TikTok"],
        featured_today: true,
        transcripcion_original: null,
        guion_ia: null,
      };
    });

    console.log(`Processing ${validRows.length} videos with upsert...`);

    // Upsert records (insert new or update existing based on tiktok_url)
    const { data: upsertedData, error: upsertError } = await supabaseServiceClient
      .from("daily_feed")
      .upsert(validRows, {
        onConflict: 'tiktok_url',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error("Error upserting data:", upsertError);
      throw upsertError;
    }

    console.log(`Successfully upserted ${upsertedData?.length || 0} records`);

    // Process AI for each video asynchronously
    const processedCount = upsertedData?.length || 0;
    let aiProcessedCount = 0;
    let aiFailedCount = 0;

    if (upsertedData && upsertedData.length > 0) {
      console.log('Starting AI processing for videos...');
      
      // Process videos in parallel but with rate limiting
      const processVideo = async (video: any) => {
        try {
          console.log(`Processing AI for video ${video.id}`);
          
          // Transcribe video
          const transcribeResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-video`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tiktokUrl: video.tiktok_url }),
            }
          );

          if (!transcribeResponse.ok) {
            throw new Error(`Transcription failed for video ${video.id}`);
          }

          const { transcription } = await transcribeResponse.json();
          console.log(`Transcribed video ${video.id}`);

          // Rewrite script
          const rewriteResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/rewrite-script`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ transcription }),
            }
          );

          if (!rewriteResponse.ok) {
            throw new Error(`Script rewriting failed for video ${video.id}`);
          }

          const { rewritten_script } = await rewriteResponse.json();
          console.log(`Rewrote script for video ${video.id}`);

          // Update video with AI results
          const { error: updateError } = await supabaseServiceClient
            .from('daily_feed')
            .update({
              transcripcion_original: transcription,
              guion_ia: rewritten_script,
            })
            .eq('id', video.id);

          if (updateError) {
            console.error(`Failed to update video ${video.id}:`, updateError);
            throw updateError;
          }

          aiProcessedCount++;
          console.log(`Successfully processed video ${video.id} (${aiProcessedCount}/${processedCount})`);
        } catch (error: any) {
          console.error(`Error processing video ${video.id}:`, error.message);
          aiFailedCount++;
        }
      };

      // Process videos in batches of 3 to avoid rate limiting
      const batchSize = 3;
      for (let i = 0; i < upsertedData.length; i += batchSize) {
        const batch = upsertedData.slice(i, i + batchSize);
        await Promise.all(batch.map(processVideo));
        // Small delay between batches
        if (i + batchSize < upsertedData.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`AI processing complete. Success: ${aiProcessedCount}, Failed: ${aiFailedCount}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: validRows.length,
        ai_processed: aiProcessedCount,
        ai_failed: aiFailedCount,
        message: `Successfully processed ${processedCount} videos. AI processing: ${aiProcessedCount} success, ${aiFailedCount} failed.`,
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
