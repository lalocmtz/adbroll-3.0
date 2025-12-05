import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Save transcription to database
async function saveTranscription(videoId: string, transcription: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, tiktokUrl, videoId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // If audio is provided as base64, use Whisper directly
    if (audioBase64) {
      console.log('Transcribing provided audio with Whisper...');
      
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const formData = new FormData();
      const blob = new Blob([bytes], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es');
      formData.append('response_format', 'text');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API error:', response.status, errorText);
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const transcription = await response.text();
      console.log('Transcription completed successfully');

      // Save to DB if videoId provided
      if (videoId) {
        await saveTranscription(videoId, transcription);
      }

      return new Response(
        JSON.stringify({ transcription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to extract audio from TikTok URL
    if (tiktokUrl) {
      console.log('Attempting to extract audio from TikTok URL:', tiktokUrl);
      
      const tiktokVideoId = extractVideoId(tiktokUrl);
      if (!tiktokVideoId) {
        console.error('Could not extract video ID from URL');
        return new Response(
          JSON.stringify({ 
            transcription: null,
            message: 'No se pudo extraer el ID del video de la URL.',
            requiresManualInput: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Extracted TikTok video ID:', tiktokVideoId);

      // Try tikwm.com API
      try {
        console.log('Trying tikwm.com API...');
        const tikwmResponse = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (tikwmResponse.ok) {
          const tikwmData = await tikwmResponse.json();
          console.log('TikWM response code:', tikwmData.code);
          
          if (tikwmData.code === 0 && tikwmData.data) {
            const audioUrl = tikwmData.data.music || tikwmData.data.play || tikwmData.data.hdplay;
            
            if (audioUrl) {
              console.log('Got media URL, downloading...');
              
              const mediaResponse = await fetch(audioUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': 'https://www.tiktok.com/',
                },
              });

              if (mediaResponse.ok) {
                const mediaBuffer = await mediaResponse.arrayBuffer();
                console.log('Downloaded media, size:', mediaBuffer.byteLength, 'bytes');
                
                if (mediaBuffer.byteLength > 25 * 1024 * 1024) {
                  console.error('Media file too large for Whisper');
                  return new Response(
                    JSON.stringify({ 
                      transcription: null,
                      message: 'El archivo de audio es demasiado grande para procesar.',
                      requiresManualInput: true
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }

                const formData = new FormData();
                const blob = new Blob([mediaBuffer], { type: 'audio/mp3' });
                formData.append('file', blob, 'audio.mp3');
                formData.append('model', 'whisper-1');
                formData.append('language', 'es');
                formData.append('response_format', 'text');

                console.log('Sending to Whisper API...');
                const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  },
                  body: formData,
                });

                if (whisperResponse.ok) {
                  const transcription = await whisperResponse.text();
                  console.log('Transcription successful, length:', transcription.length);

                  // Save to DB if videoId provided
                  if (videoId) {
                    await saveTranscription(videoId, transcription);
                  }

                  return new Response(
                    JSON.stringify({ transcription }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                } else {
                  const errorText = await whisperResponse.text();
                  console.error('Whisper API error:', whisperResponse.status, errorText);
                }
              } else {
                console.error('Failed to download media:', mediaResponse.status);
              }
            }
          }
        }
      } catch (tikwmError) {
        console.error('TikWM API error:', tikwmError);
      }

      // Fallback: try alternative API
      try {
        console.log('Trying alternative downloader (tikmate)...');
        const altResponse = await fetch('https://api.tikmate.app/api/lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: `url=${encodeURIComponent(tiktokUrl)}`,
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          
          if (altData.success && altData.video_url) {
            console.log('Got video URL from alternative API');
            
            const videoResponse = await fetch(altData.video_url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            });

            if (videoResponse.ok) {
              const videoBuffer = await videoResponse.arrayBuffer();
              
              if (videoBuffer.byteLength <= 25 * 1024 * 1024) {
                const formData = new FormData();
                const blob = new Blob([videoBuffer], { type: 'video/mp4' });
                formData.append('file', blob, 'video.mp4');
                formData.append('model', 'whisper-1');
                formData.append('language', 'es');
                formData.append('response_format', 'text');

                const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  },
                  body: formData,
                });

                if (whisperResponse.ok) {
                  const transcription = await whisperResponse.text();
                  console.log('Transcription successful via alternative API');

                  // Save to DB if videoId provided
                  if (videoId) {
                    await saveTranscription(videoId, transcription);
                  }

                  return new Response(
                    JSON.stringify({ transcription }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }
            }
          }
        }
      } catch (altError) {
        console.error('Alternative API error:', altError);
      }
    }

    // If all methods fail
    console.log('All automatic transcription methods failed');
    
    return new Response(
      JSON.stringify({ 
        transcription: null,
        message: 'No se pudo extraer el audio automáticamente. Intenta de nuevo más tarde.',
        requiresManualInput: true
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
