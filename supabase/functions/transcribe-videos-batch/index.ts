import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Transcribe a single video with AssemblyAI
async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  console.log(`[transcribe] Starting AssemblyAI transcription for: ${audioUrl.substring(0, 50)}...`);
  
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

  // Poll for completion (max 3 minutes per video)
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

// Analyze transcript with Lovable AI Gateway
async function analyzeTranscript(transcript: string): Promise<{ hook: string; body: string; cta: string }> {
  console.log(`[analyze] Analyzing transcript with Lovable AI`);
  
  const prompt = `Analiza este guion de TikTok y divídelo en sus partes estructurales.

GUION:
${transcript}

Responde SOLO con JSON válido en este formato exacto:
{
  "hook": "el gancho inicial que captura atención (primeras 1-2 oraciones)",
  "body": "el cuerpo principal del contenido",
  "cta": "la llamada a la acción final"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Eres un experto en análisis de guiones de TikTok. Siempre respondes en JSON válido sin markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[analyze] Lovable AI error:`, error);
    // Return empty analysis if AI fails
    return { hook: '', body: transcript, cta: '' };
  }

  const data = await response.json();
  try {
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { hook: '', body: transcript, cta: '' };
  }
}

// Process a single video: transcribe + analyze
async function processVideo(
  supabase: any,
  videoId: string,
  videoMp4Url: string
): Promise<boolean> {
  try {
    console.log(`[process] Processing video ${videoId}`);
    
    // Update status to transcribing
    await supabase
      .from('videos')
      .update({ processing_status: 'transcribing' })
      .eq('id', videoId);
    
    // Transcribe
    const transcript = await transcribeWithAssemblyAI(videoMp4Url);
    
    if (!transcript || transcript.trim() === '') {
      console.warn(`[process] Empty transcript for video ${videoId}`);
      await supabase
        .from('videos')
        .update({ processing_status: 'transcription_failed' })
        .eq('id', videoId);
      return false;
    }
    
    // Analyze
    await supabase
      .from('videos')
      .update({ 
        transcript,
        processing_status: 'analyzing'
      })
      .eq('id', videoId);
    
    const analysis = await analyzeTranscript(transcript);
    
    // Save final result
    await supabase
      .from('videos')
      .update({ 
        transcript,
        analysis_json: analysis,
        processing_status: 'analyzed'
      })
      .eq('id', videoId);
    
    console.log(`[process] ✓ Video ${videoId} transcribed and analyzed`);
    return true;
    
  } catch (error) {
    console.error(`[process] Error processing video ${videoId}:`, error);
    await supabase
      .from('videos')
      .update({ processing_status: 'transcription_failed' })
      .eq('id', videoId);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 3 } = await req.json().catch(() => ({}));
    
    if (!ASSEMBLYAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ASSEMBLYAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get videos that have MP4 but no transcript yet
    const { data: pendingVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, video_mp4_url')
      .not('video_mp4_url', 'is', null)
      .is('transcript', null)
      .not('processing_status', 'eq', 'transcribing')
      .not('processing_status', 'eq', 'analyzing')
      .not('processing_status', 'eq', 'transcription_failed')
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch pending videos: ${fetchError.message}`);
    }

    if (!pendingVideos || pendingVideos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          remaining: 0,
          message: 'No videos pending transcription'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[batch] Processing ${pendingVideos.length} videos`);
    
    let successCount = 0;
    let failCount = 0;

    // Process videos sequentially (AssemblyAI has rate limits)
    for (const video of pendingVideos) {
      const success = await processVideo(supabase, video.id, video.video_mp4_url);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay between videos
      await new Promise(r => setTimeout(r, 1000));
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .not('video_mp4_url', 'is', null)
      .is('transcript', null)
      .not('processing_status', 'eq', 'transcription_failed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pendingVideos.length,
        successful: successCount,
        failed: failCount,
        remaining: remaining || 0,
        complete: (remaining || 0) === 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[transcribe-videos-batch] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
