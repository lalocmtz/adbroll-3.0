import { AIError } from '../_shared/ai-contracts.ts';
import { authenticatedAI, failure, headers, reply } from '../_shared/gemini.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const { db } = await authenticatedAI(req);
    const { videoUrl } = await req.json();
    let url: URL;
    try { url = new URL(videoUrl); } catch { throw new AIError('Introduce el enlace completo del video de TikTok.', 400); }
    const id = url.pathname.match(/^\/@[^/]+\/video\/(\d+)\/?$/)?.[1];
    if (url.protocol !== 'https:' || !['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(url.hostname) || !id) throw new AIError('Usa el enlace completo de TikTok que contiene /video/ y el número del video.', 400);
    const found = await db.from('videos').select('id,video_mp4_url').eq('tiktok_video_id', id).limit(1).maybeSingle();
    if (found.error) throw new AIError('No se pudo consultar el catálogo.', 503);
    if (!found.data?.video_mp4_url) throw new AIError('Este video todavía no está disponible en el catálogo. Elige uno de la sección Videos; las descargas de enlaces nuevos siguen pendientes de conexión.', 404);
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-and-analyze`, {
      method: 'POST', headers: { Authorization: req.headers.get('Authorization')!, apikey: Deno.env.get('SUPABASE_ANON_KEY')!, 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: found.data.id }), signal: AbortSignal.timeout(260000),
    });
    const result = await response.json();
    if (!response.ok || !result.success) return reply({ error: result.error || 'No se pudo analizar el video.' }, response.ok ? 502 : response.status);
    return reply({ transcript: result.transcript, segments: (result.analysis?.segments || []).map((s: any) => ({ start_ms: Math.round(s.start_seconds * 1000), end_ms: Math.round(s.end_seconds * 1000), text: s.text })), cached: result.cached });
  } catch (error) { return failure(error); }
});
