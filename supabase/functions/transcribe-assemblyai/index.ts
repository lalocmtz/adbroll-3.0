import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, videoId } = await req.json();

    if (!videoUrl || !videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoUrl or videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ASSEMBLYAI_API_KEY) {
      console.error('ASSEMBLYAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AssemblyAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting AssemblyAI transcription for:', videoUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if transcript already exists
    const { data: existing } = await supabase
      .from('daily_feed')
      .select('transcripcion_original')
      .eq('id', videoId)
      .maybeSingle();

    if (existing?.transcripcion_original) {
      console.log('Transcript already exists, returning cached version');
      return new Response(
        JSON.stringify({ 
          status: 'completed',
          transcript: existing.transcripcion_original 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Submit transcription request to AssemblyAI
    console.log('Submitting to AssemblyAI...');
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        language_code: 'es',
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('AssemblyAI submit error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to submit transcription', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const submitData = await submitResponse.json();
    const transcriptId = submitData.id;
    console.log('AssemblyAI transcript ID:', transcriptId);

    // Step 2: Poll for completion (max 60 seconds with 3s intervals)
    const maxAttempts = 20;
    let attempts = 0;
    let transcript = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      });

      if (!pollResponse.ok) {
        console.error('AssemblyAI poll error');
        attempts++;
        continue;
      }

      const pollData = await pollResponse.json();
      console.log('AssemblyAI status:', pollData.status, 'attempt:', attempts + 1);

      if (pollData.status === 'completed') {
        transcript = pollData.text;
        break;
      } else if (pollData.status === 'error') {
        console.error('AssemblyAI transcription failed:', pollData.error);
        return new Response(
          JSON.stringify({ error: 'Transcription failed', details: pollData.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      attempts++;
    }

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcription timed out after 60 seconds' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to database
    console.log('Saving transcript to database...');
    const { error: updateError } = await supabase
      .from('daily_feed')
      .update({ transcripcion_original: transcript })
      .eq('id', videoId);

    if (updateError) {
      console.error('Error saving transcript:', updateError);
    }

    console.log('Transcription completed successfully');
    return new Response(
      JSON.stringify({ 
        status: 'completed',
        transcript: transcript 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in transcribe-assemblyai:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
