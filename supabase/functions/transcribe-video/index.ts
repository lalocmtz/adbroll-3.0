import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tiktokUrl, videoId } = await req.json();

    if (!tiktokUrl || !videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing tiktokUrl or videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received transcription request for:', tiktokUrl, 'videoId:', videoId);

    const supabase = getSupabaseClient();

    // Check if transcript already exists
    const { data: existing } = await supabase
      .from('daily_feed')
      .select('transcripcion_original')
      .eq('id', videoId)
      .maybeSingle();

    if (existing?.transcripcion_original) {
      console.log('Transcript already exists, returning immediately');
      return new Response(
        JSON.stringify({ 
          status: 'completed',
          transcription: existing.transcripcion_original 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already in queue
    const { data: existingJob } = await supabase
      .from('transcription_queue')
      .select('id, status')
      .eq('video_id', videoId)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (existingJob) {
      console.log('Job already in queue:', existingJob.id);
      return new Response(
        JSON.stringify({ 
          status: 'queued',
          message: 'Video ya está en proceso de transcripción' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add to queue
    const { error: insertError } = await supabase
      .from('transcription_queue')
      .insert({
        video_id: videoId,
        video_url: tiktokUrl,
        status: 'pending'
      });

    if (insertError) {
      console.error('Error adding to queue:', insertError);
      throw new Error('Failed to queue transcription');
    }

    console.log('Video enqueued for transcription');

    // Trigger the worker immediately (fire and forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    fetch(`${supabaseUrl}/functions/v1/transcription-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ trigger: 'immediate' })
    }).catch(err => console.log('Worker trigger sent'));

    return new Response(
      JSON.stringify({ 
        status: 'queued',
        message: 'Transcripción en cola. Procesando en segundo plano.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in transcribe-video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});