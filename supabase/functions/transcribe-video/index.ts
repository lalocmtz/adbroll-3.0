import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tiktokUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Transcribing video from:', tiktokUrl);

    // Extract TikTok video ID for processing
    const videoId = tiktokUrl.match(/\/video\/(\d+)/)?.[1] || tiktokUrl;
    
    // For MVP: Return mock transcription
    // TODO: Implement actual audio extraction and transcription
    const mockTranscription = `[Transcripción del video ${videoId}]

Este es un video increíble que demuestra el producto de manera clara y directa.

En los primeros segundos, el creador muestra el producto en acción, destacando sus características principales y beneficios inmediatos.

A mitad del video, incluye testimonios reales y demuestra casos de uso específicos que resuenan con la audiencia.

El cierre es poderoso: llamado a la acción directo con urgencia y escasez para motivar la compra inmediata.`;

    return new Response(
      JSON.stringify({ transcription: mockTranscription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in transcribe-video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
