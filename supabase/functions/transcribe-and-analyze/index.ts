import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  console.log(`[transcribe] Starting AssemblyAI transcription for: ${audioUrl}`);
  
  // Submit transcription job
  const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'es'
    })
  });

  if (!submitResponse.ok) {
    const error = await submitResponse.text();
    throw new Error(`AssemblyAI submit failed: ${error}`);
  }

  const { id: transcriptId } = await submitResponse.json();
  console.log(`[transcribe] Job submitted, ID: ${transcriptId}`);

  // Poll for completion
  let status = 'queued';
  let transcript = '';
  const maxAttempts = 60;
  let attempts = 0;

  while (status !== 'completed' && status !== 'error' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': ASSEMBLYAI_API_KEY! }
    });
    
    const pollData = await pollResponse.json();
    status = pollData.status;
    console.log(`[transcribe] Poll attempt ${attempts + 1}, status: ${status}`);
    
    if (status === 'completed') {
      transcript = pollData.text;
    } else if (status === 'error') {
      throw new Error(`AssemblyAI error: ${pollData.error}`);
    }
    
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Transcription timeout');
  }

  return transcript;
}

async function analyzeWithOpenAI(transcript: string): Promise<{ analysis: any; variants: any }> {
  console.log(`[analyze] Analyzing transcript with OpenAI`);
  
  // Analysis prompt
  const analysisPrompt = `Analiza este guion de TikTok y divídelo en sus partes estructurales.

GUION:
${transcript}

Responde SOLO con JSON válido en este formato exacto:
{
  "hook": "el gancho inicial que captura atención (primeras 1-2 oraciones)",
  "body": "el cuerpo principal del contenido",
  "cta": "la llamada a la acción final"
}`;

  const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un experto en análisis de guiones de TikTok. Siempre respondes en JSON válido.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3
    })
  });

  if (!analysisResponse.ok) {
    const error = await analysisResponse.text();
    throw new Error(`OpenAI analysis failed: ${error}`);
  }

  const analysisData = await analysisResponse.json();
  let analysis;
  try {
    const content = analysisData.choices[0].message.content;
    analysis = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    analysis = { hook: '', body: transcript, cta: '' };
  }

  // Variants prompt
  const variantsPrompt = `Basándote en este guion de TikTok, genera variantes creativas.

GUION ORIGINAL:
${transcript}

Genera:
1. Tres hooks alternativos (ganchos iniciales diferentes pero igual de efectivos)
2. Una variante del cuerpo (mismo mensaje, diferente forma de decirlo)

Responde SOLO con JSON válido en este formato exacto:
{
  "hooks": ["hook alternativo 1", "hook alternativo 2", "hook alternativo 3"],
  "body_variant": "variante del cuerpo del guion"
}`;

  const variantsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un experto en copywriting para TikTok. Siempre respondes en JSON válido.' },
        { role: 'user', content: variantsPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!variantsResponse.ok) {
    const error = await variantsResponse.text();
    throw new Error(`OpenAI variants failed: ${error}`);
  }

  const variantsData = await variantsResponse.json();
  let variants;
  try {
    const content = variantsData.choices[0].message.content;
    variants = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    variants = { hooks: [], body_variant: '' };
  }

  return { analysis, variants };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ASSEMBLYAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get video from database
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (fetchError || !video) {
      return new Response(
        JSON.stringify({ error: 'Video not found', details: fetchError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already has transcript
    if (video.transcript && video.analysis_json && video.variants_json) {
      console.log(`[transcribe-and-analyze] Video already processed`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          transcript: video.transcript,
          analysis: video.analysis_json,
          variants: video.variants_json,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioUrl = video.video_mp4_url;
    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Video MP4 not available. Please download the video first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('videos')
      .update({ processing_status: 'transcribing' })
      .eq('id', videoId);

    // Transcribe
    const transcript = await transcribeWithAssemblyAI(audioUrl);
    console.log(`[transcribe-and-analyze] Transcript received: ${transcript.substring(0, 100)}...`);

    // Update with transcript
    await supabase
      .from('videos')
      .update({ 
        transcript,
        processing_status: 'analyzing'
      })
      .eq('id', videoId);

    // Analyze with OpenAI
    const { analysis, variants } = await analyzeWithOpenAI(transcript);
    console.log(`[transcribe-and-analyze] Analysis complete`);

    // Save everything to database
    const { error: updateError } = await supabase
      .from('videos')
      .update({ 
        transcript,
        analysis_json: analysis,
        variants_json: variants,
        processing_status: 'completed'
      })
      .eq('id', videoId);

    if (updateError) {
      console.error(`[transcribe-and-analyze] DB update error:`, updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save analysis', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript,
        analysis,
        variants
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[transcribe-and-analyze] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
