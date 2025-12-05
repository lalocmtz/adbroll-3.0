import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Declare EdgeRuntime for TypeScript
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from TikTok URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/,
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Save transcription to database
async function saveTranscription(videoId: string, transcription: string) {
  const supabase = getSupabaseClient();
  console.log('Saving transcription to DB for video:', videoId);
  
  const { error } = await supabase
    .from('daily_feed')
    .update({ transcripcion_original: transcription })
    .eq('id', videoId);

  if (error) {
    console.error('Error saving transcription to DB:', error);
    throw new Error('Failed to save transcription');
  }

  console.log('Transcription saved successfully');
}

// Save error status to help with debugging
async function saveError(videoId: string, errorMsg: string) {
  const supabase = getSupabaseClient();
  console.error('Transcription failed for video:', videoId, '-', errorMsg);
}

// Try multiple TikTok download services
async function extractAudioFromTikTok(tiktokUrl: string): Promise<ArrayBuffer | null> {
  const videoId = extractVideoId(tiktokUrl);
  if (!videoId) {
    console.error('Could not extract video ID from URL');
    return null;
  }

  console.log('Extracted TikTok video ID:', videoId);
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Try Service 1: tikwm.com
  try {
    console.log('Trying tikwm.com API...');
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': userAgent },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.code === 0 && data.data) {
        // Try video URL first (better audio quality)
        const mediaUrl = data.data.play || data.data.hdplay || data.data.music;
        if (mediaUrl) {
          console.log('tikwm: Got media URL, downloading...');
          const mediaRes = await fetch(mediaUrl, {
            headers: { 'User-Agent': userAgent, 'Referer': 'https://www.tiktok.com/' },
          });
          if (mediaRes.ok) {
            const buffer = await mediaRes.arrayBuffer();
            console.log('tikwm: Downloaded media, size:', buffer.byteLength);
            if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
              return buffer;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('tikwm error:', e);
  }

  // Try Service 2: snaptik.app API
  try {
    console.log('Trying snaptik API...');
    const response = await fetch('https://snaptik.app/abc2.php', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://snaptik.app',
      },
      body: `url=${encodeURIComponent(tiktokUrl)}&lang=en&token=`,
    });

    if (response.ok) {
      const html = await response.text();
      // Extract video URL from response
      const urlMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        const videoUrl = urlMatch[1].replace(/\\u0026/g, '&');
        console.log('snaptik: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('snaptik: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('snaptik error:', e);
  }

  // Try Service 3: ssstik.io
  try {
    console.log('Trying ssstik.io API...');
    const response = await fetch('https://ssstik.io/abc?url=dl', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://ssstik.io',
        'Referer': 'https://ssstik.io/',
      },
      body: `id=${encodeURIComponent(tiktokUrl)}&locale=en&tt=`,
    });

    if (response.ok) {
      const html = await response.text();
      const urlMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>Without watermark/i) ||
                       html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        const videoUrl = urlMatch[1];
        console.log('ssstik: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('ssstik: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('ssstik error:', e);
  }

  // Try Service 4: tikmate API
  try {
    console.log('Trying tikmate API...');
    const response = await fetch('https://api.tikmate.app/api/lookup', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent 
      },
      body: `url=${encodeURIComponent(tiktokUrl)}`,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && (data.video_url || data.token)) {
        const videoUrl = data.video_url || `https://tikmate.app/download/${data.token}.mp4`;
        console.log('tikmate: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('tikmate: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('tikmate error:', e);
  }

  // Try Service 5: musicaldown.com
  try {
    console.log('Trying musicaldown API...');
    const response = await fetch('https://musicaldown.com/download', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://musicaldown.com',
        'Referer': 'https://musicaldown.com/en',
      },
      body: `url=${encodeURIComponent(tiktokUrl)}`,
    });

    if (response.ok) {
      const html = await response.text();
      const urlMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        const videoUrl = urlMatch[1];
        console.log('musicaldown: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('musicaldown: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('musicaldown error:', e);
  }

  return null;
}

// Transcribe audio with Whisper
async function transcribeWithWhisper(audioBuffer: ArrayBuffer): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('Sending to Whisper API, buffer size:', audioBuffer.byteLength);

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'video/mp4' });
  formData.append('file', blob, 'video.mp4');
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper API error:', response.status, errorText);
    return null;
  }

  const transcription = await response.text();
  console.log('Transcription completed, length:', transcription.length);
  return transcription;
}

// Background transcription task
async function processTranscription(videoId: string, tiktokUrl: string) {
  console.log('Background task started for video:', videoId);
  
  try {
    // Step 1: Extract audio from TikTok
    console.log('Step 1: Extracting audio from TikTok...');
    const audioBuffer = await extractAudioFromTikTok(tiktokUrl);
    
    if (!audioBuffer) {
      console.error('All audio extraction methods failed');
      await saveError(videoId, 'No se pudo extraer el audio del video');
      return;
    }

    // Step 2: Transcribe with Whisper
    console.log('Step 2: Transcribing with Whisper...');
    const transcription = await transcribeWithWhisper(audioBuffer);
    
    if (!transcription) {
      console.error('Whisper transcription failed');
      await saveError(videoId, 'Error en la transcripción');
      return;
    }

    // Step 3: Save to database
    console.log('Step 3: Saving to database...');
    await saveTranscription(videoId, transcription);
    
    console.log('Background task completed successfully');
  } catch (error: any) {
    console.error('Background task error:', error);
    await saveError(videoId, error.message);
  }
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

    // Check if transcript already exists
    const supabase = getSupabaseClient();
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

    // Start background processing with waitUntil
    console.log('Starting background transcription task...');
    
    // Use EdgeRuntime.waitUntil for background processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(processTranscription(videoId, tiktokUrl));
    } else {
      // Fallback: fire and forget (don't await to avoid timeout)
      console.log('EdgeRuntime not available, running in background');
      processTranscription(videoId, tiktokUrl).catch(console.error);
    }

    // Return immediately
    return new Response(
      JSON.stringify({ 
        status: 'processing',
        message: 'Transcripción iniciada. El guión estará listo en unos segundos.' 
      }),
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
