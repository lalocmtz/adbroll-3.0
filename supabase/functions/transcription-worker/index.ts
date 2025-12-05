import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

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

// Try multiple TikTok download services
async function extractAudioFromTikTok(tiktokUrl: string): Promise<ArrayBuffer | null> {
  const videoId = extractVideoId(tiktokUrl);
  console.log('Extracted TikTok video ID:', videoId);
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Service 1: tikwm.com (most reliable)
  try {
    console.log('Trying tikwm.com API...');
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json', 
        'User-Agent': userAgent,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('tikwm response code:', data.code);
      
      if (data.code === 0 && data.data) {
        const mediaUrl = data.data.play || data.data.hdplay || data.data.wmplay;
        if (mediaUrl) {
          console.log('tikwm: Got media URL, downloading...');
          const mediaRes = await fetch(mediaUrl, {
            headers: { 
              'User-Agent': userAgent, 
              'Referer': 'https://www.tiktok.com/',
              'Accept': '*/*'
            },
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

  // Service 2: tikcdn.io
  try {
    console.log('Trying tikcdn.io API...');
    const response = await fetch('https://tikcdn.io/api/download', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({ url: tiktokUrl }),
    });

    if (response.ok) {
      const data = await response.json();
      const videoUrl = data.video?.noWatermark || data.video?.watermark;
      if (videoUrl) {
        console.log('tikcdn: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('tikcdn: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('tikcdn error:', e);
  }

  // Service 3: savetik.co API
  try {
    console.log('Trying savetik API...');
    const formData = new URLSearchParams();
    formData.append('q', tiktokUrl);
    
    const response = await fetch('https://savetik.co/api/ajaxSearch', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://savetik.co',
        'Referer': 'https://savetik.co/',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok' && data.data) {
        // Parse HTML response to find video URL
        const urlMatch = data.data.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
        if (urlMatch) {
          const videoUrl = urlMatch[1].replace(/&amp;/g, '&');
          console.log('savetik: Got video URL');
          const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
          if (mediaRes.ok) {
            const buffer = await mediaRes.arrayBuffer();
            console.log('savetik: Downloaded, size:', buffer.byteLength);
            if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
              return buffer;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('savetik error:', e);
  }

  // Service 4: ttdownloader.com
  try {
    console.log('Trying ttdownloader API...');
    const formData = new URLSearchParams();
    formData.append('url', tiktokUrl);
    formData.append('format', '');
    
    const response = await fetch('https://ttdownloader.com/req/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://ttdownloader.com',
        'Referer': 'https://ttdownloader.com/',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const html = await response.text();
      const urlMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>.*?Without.*?watermark/is) ||
                       html.match(/<a[^>]+href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        const videoUrl = urlMatch[1];
        console.log('ttdownloader: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('ttdownloader: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('ttdownloader error:', e);
  }

  // Service 5: tmate.cc
  try {
    console.log('Trying tmate.cc API...');
    const formData = new URLSearchParams();
    formData.append('url', tiktokUrl);
    
    const response = await fetch('https://tmate.cc/download', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://tmate.cc',
        'Referer': 'https://tmate.cc/',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const html = await response.text();
      const urlMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (urlMatch) {
        const videoUrl = urlMatch[1];
        console.log('tmate: Got video URL');
        const mediaRes = await fetch(videoUrl, { headers: { 'User-Agent': userAgent } });
        if (mediaRes.ok) {
          const buffer = await mediaRes.arrayBuffer();
          console.log('tmate: Downloaded, size:', buffer.byteLength);
          if (buffer.byteLength > 1000 && buffer.byteLength <= 25 * 1024 * 1024) {
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.error('tmate error:', e);
  }

  console.error('All audio extraction methods failed');
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

// Process a single job
async function processJob(supabase: any, job: any): Promise<void> {
  console.log('Processing job:', job.id, 'for video:', job.video_id);
  
  try {
    // Mark as processing
    await supabase
      .from('transcription_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    // Step 1: Extract audio
    console.log('Step 1: Extracting audio from TikTok...');
    const audioBuffer = await extractAudioFromTikTok(job.video_url);
    
    if (!audioBuffer) {
      throw new Error('No se pudo extraer el audio del video');
    }

    // Step 2: Transcribe with Whisper
    console.log('Step 2: Transcribing with Whisper...');
    const transcription = await transcribeWithWhisper(audioBuffer);
    
    if (!transcription) {
      throw new Error('Error en la transcripción');
    }

    // Step 3: Save to daily_feed
    console.log('Step 3: Saving to daily_feed...');
    const { error: updateError } = await supabase
      .from('daily_feed')
      .update({ transcripcion_original: transcription })
      .eq('id', job.video_id);

    if (updateError) {
      throw new Error(`Failed to save transcription: ${updateError.message}`);
    }

    // Step 4: Mark job as completed
    await supabase
      .from('transcription_queue')
      .update({ 
        status: 'completed', 
        transcription_text: transcription,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log('Job completed successfully:', job.id);

  } catch (error: any) {
    console.error('Job failed:', job.id, error.message);
    
    const attempts = (job.attempts || 0) + 1;
    const newStatus = attempts >= 3 ? 'failed' : 'pending';
    
    await supabase
      .from('transcription_queue')
      .update({ 
        status: newStatus,
        error: error.message,
        attempts: attempts,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

// Background worker function
async function processQueue() {
  console.log('Worker: Processing queue...');
  const supabase = getSupabaseClient();
  
  // Get pending jobs (limit 2 to avoid overload)
  const { data: jobs, error } = await supabase
    .from('transcription_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(2);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('Worker: No pending jobs');
    return;
  }

  console.log(`Worker: Found ${jobs.length} pending jobs`);

  // Process jobs sequentially to avoid rate limits
  for (const job of jobs) {
    await processJob(supabase, job);
    // Small delay between jobs
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Worker: Queue processing completed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Worker triggered');
    
    // Use EdgeRuntime.waitUntil for background processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(processQueue());
      console.log('Worker: Background processing started with waitUntil');
    } else {
      // Fallback: process directly but don't await
      processQueue().catch(console.error);
      console.log('Worker: Background processing started without waitUntil');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Worker started' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});