import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

// Extract video ID from TikTok URL
function extractVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// Try multiple services to get direct video URL
async function extractDirectVideoUrl(tiktokUrl: string): Promise<string | null> {
  const videoId = extractVideoId(tiktokUrl);
  if (!videoId) {
    console.error('Could not extract video ID from URL:', tiktokUrl);
    return null;
  }

  console.log('Extracted video ID:', videoId);

  // Service 1: tikwm.com
  try {
    console.log('Trying tikwm.com...');
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.data?.play) {
        console.log('tikwm.com success');
        return data.data.play;
      }
      if (data?.data?.hdplay) {
        console.log('tikwm.com HD success');
        return data.data.hdplay;
      }
    }
  } catch (e) {
    console.log('tikwm.com failed:', e);
  }

  // Service 2: tikcdn.io
  try {
    console.log('Trying tikcdn.io...');
    const response = await fetch('https://tikcdn.io/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      },
      body: `url=${encodeURIComponent(tiktokUrl)}`
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.video) {
        console.log('tikcdn.io success');
        return data.video;
      }
    }
  } catch (e) {
    console.log('tikcdn.io failed:', e);
  }

  // Service 3: savetik.co
  try {
    console.log('Trying savetik.co...');
    const response = await fetch(`https://api.savetik.co/api?url=${encodeURIComponent(tiktokUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.result?.video_no_watermark) {
        console.log('savetik.co success');
        return data.result.video_no_watermark;
      }
    }
  } catch (e) {
    console.log('savetik.co failed:', e);
  }

  // Service 4: tmate.cc
  try {
    console.log('Trying tmate.cc...');
    const response = await fetch(`https://api.tmate.cc/video/${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.download?.nowm) {
        console.log('tmate.cc success');
        return data.download.nowm;
      }
    }
  } catch (e) {
    console.log('tmate.cc failed:', e);
  }

  // Service 5: ttdownloader
  try {
    console.log('Trying ttdownloader...');
    const response = await fetch(`https://ttdownloader.com/api?url=${encodeURIComponent(tiktokUrl)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.video_url) {
        console.log('ttdownloader success');
        return data.video_url;
      }
    }
  } catch (e) {
    console.log('ttdownloader failed:', e);
  }

  console.error('All video extraction services failed');
  return null;
}

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

    console.log('Starting transcription for TikTok URL:', videoUrl);

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

    // Step 1: Extract direct video URL from TikTok
    console.log('Extracting direct video URL...');
    const directVideoUrl = await extractDirectVideoUrl(videoUrl);
    
    if (!directVideoUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'No se pudo extraer el video de TikTok. Intenta con otro video.',
          details: 'All extraction services failed'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Direct video URL obtained:', directVideoUrl.substring(0, 100) + '...');

    // Step 2: Submit transcription request to AssemblyAI with direct video URL
    console.log('Submitting to AssemblyAI...');
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: directVideoUrl,
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

    // Step 3: Poll for completion (max 90 seconds with 3s intervals)
    const maxAttempts = 30;
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
        JSON.stringify({ error: 'Transcription timed out after 90 seconds' }),
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
