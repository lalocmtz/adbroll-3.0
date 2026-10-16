import { AIError } from '../_shared/ai-contracts.ts';
import { authenticatedAI, failure, headers, reply, reserve } from '../_shared/gemini.ts';
import { analyzeOwnedVideo } from '../_shared/analyze-owned-video.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const { db, userId } = await authenticatedAI(req);
    let body; try { body = await req.json(); } catch { throw new AIError('Solicitud inválida.',400); }
    const videoId = body.videoId;
    if (typeof videoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(videoId)) throw new AIError('Video no válido.',400);
    return reply(await analyzeOwnedVideo(db,videoId,{ reserveUsage:()=>reserve(db,userId,'video') }));
  } catch(error) { return failure(error); }
});
