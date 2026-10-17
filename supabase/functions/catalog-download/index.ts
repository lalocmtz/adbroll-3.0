import { apifyErrorLog, apifyResponseError, downloadStartFailure } from '../_shared/apify-errors.ts';
import { AIError, ownedVideoUrl } from '../_shared/ai-contracts.ts';
import { authenticatedAI, failure, headers, reply } from '../_shared/gemini.ts';
import { apifyId, boundedMP4, canonicalTikTok, verifiedDownload } from '../_shared/download-contracts.ts';
import { storeCatalogPoster } from '../_shared/catalog-posters.ts';
const pending = () => reply({ status: 'pending', retryAfterSeconds: 8 }, 202);
async function provider(path: string, key: string, init: RequestInit = {}) {
  try {
    const response = await fetch(`https://api.apify.com/v2/${path}`, {
      ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw await apifyResponseError(response);
    return await response.json();
  } catch (error) {
    console.warn('catalog_download_provider', apifyErrorLog(error));
    throw error;
  }
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const { db, userId } = await authenticatedAI(req);
    let body; try { body = await req.json(); } catch { throw new AIError('Solicitud no válida.', 400); }
    const source = canonicalTikTok(body.videoUrl);
    const existing = await db.from('videos').select('id,video_mp4_url').eq('tiktok_video_id',source.id).limit(1).maybeSingle();
    if (existing.error) throw new AIError('No se pudo consultar el catálogo.', 503);
    if (existing.data?.video_mp4_url) {
      try {
        ownedVideoUrl(existing.data.video_mp4_url, Deno.env.get('SUPABASE_URL')!);
        return reply({ status: 'ready', videoId: existing.data.id });
      } catch { /* Foreign legacy media must first be copied into owned storage. */ }
    }
    const key = Deno.env.get('APIFY_API_TOKEN');
    if (!key) throw new AIError('El servicio de descarga está pendiente de configuración.', 503);
    const reservation = await db.rpc('reserve_catalog_download', { p_user_id:userId,p_tiktok_id:source.id,p_source_url:source.url });
    if (reservation.error || !reservation.data) throw new AIError('No se pudo reservar la descarga.', 503);
    if (reservation.data.denied) throw new AIError('Necesitas una suscripción activa.', 403);
    if (reservation.data.limited) throw new AIError('Llegamos al límite diario de descargas. Puedes usar los videos ya disponibles o volver mañana.',429);
    const job = reservation.data.job;
    if (reservation.data.started) {
      try {
        const result = await provider('acts/clockworks~tiktok-video-scraper/runs?waitForFinish=0&timeout=180&maxItems=1&maxTotalChargeUsd=0.05',key,{
          method:'POST', body:JSON.stringify({ postURLs:[source.url],scrapeRelatedVideos:false,shouldDownloadVideos:true,shouldDownloadCovers:false,shouldDownloadSlideshowImages:false,shouldDownloadSubtitles:false,shouldDownloadAvatars:false }),
        });
        const runId = apifyId(result.data?.id);
        const saved = await db.from('catalog_download_jobs').update({run_id:runId,status:'running',updated_at:new Date().toISOString()}).eq('tiktok_video_id',source.id).eq('status','starting');
        if (saved.error) throw new AIError('No se pudo guardar el estado de descarga.',503);
        return pending();
      } catch (error) {
        // Only definite HTTP rejections can later retry; lost responses stay reserved.
        const failedStart = downloadStartFailure(error);
        const saved = await db.from('catalog_download_jobs').update({...failedStart,updated_at:new Date().toISOString()}).eq('tiktok_video_id',source.id).eq('status','starting');
        if (saved.error) throw new AIError('No se pudo guardar el estado de descarga. Contacta a soporte.',503);
        throw new AIError(failedStart.failure_message, failedStart.status === 'rejected' ? 422 : 503);
      }
    }
    if (job.status === 'failed' || job.status === 'unknown' || job.status === 'rejected') throw new AIError(job.failure_message || 'Este video no se pudo descargar. Prueba con otro video público.',422);
    if (job.status === 'starting') {
      if (Date.now()-new Date(job.created_at).getTime()>90000) throw new AIError('La descarga necesita revisión de soporte antes de reintentarse.',503);
      return pending();
    }
    if (job.status === 'ready') throw new AIError('El archivo de este video necesita revisión. Contacta a soporte.',409);
    const token = crypto.randomUUID();
    const claim = await db.rpc('claim_catalog_download_poll',{p_tiktok_id:source.id,p_token:token});
    if (claim.error) throw new AIError('No se pudo consultar la descarga.',503);
    if (!claim.data) return pending();
    const update = async (values: Record<string,unknown>) => {
      const result = await db.from('catalog_download_jobs').update({...values,updated_at:new Date().toISOString()}).eq('tiktok_video_id',source.id).eq('poll_token',token);
      if (result.error) throw new AIError('No se pudo guardar el estado de descarga.',503);
    };
    try {
      const run = (await provider(`actor-runs/${apifyId(job.run_id)}`,key)).data;
      if (run?.id !== job.run_id) throw new AIError('Estado del proveedor no válido.',502);
      if (['FAILED','ABORTED','TIMED-OUT'].includes(run.status)) throw new AIError('TikTok no permitió descargar este video. Prueba con otro enlace público.',422);
      if (run.status !== 'SUCCEEDED') {
        await update({poll_after:new Date(Date.now()+8000).toISOString()}); return pending();
      }
      const rows = await provider(`datasets/${apifyId(run.defaultDatasetId)}/items?clean=true&limit=2`,key);
      const {item,url} = verifiedDownload(rows,source.id,apifyId(run.defaultKeyValueStoreId));
      const media = await fetch(url,{headers:{Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.timeout(45000)});
      const bytes = await boundedMP4(media);
      const path = `on-demand/${source.id}.mp4`;
      const upload = await db.storage.from('videos').upload(path,bytes,{contentType:'video/mp4',upsert:true,cacheControl:'31536000'});
      if (upload.error) throw new AIError('No se pudo guardar el MP4. Vuelve a intentarlo.',503);
      const mediaUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/videos/${path}`;
      // Recheck after download: a concurrent catalogue import may have added this ID.
      const current = await db.from('videos').select('id').eq('tiktok_video_id',source.id).limit(1).maybeSingle();
      if (current.error) throw new AIError('No se pudo actualizar el catálogo.',503);
      const posterUrl=await storeCatalogPoster(db,item,source.id,Deno.env.get('SUPABASE_URL')!);
      const mediaFields = {video_mp4_url:mediaUrl,...(posterUrl?{thumbnail_url:posterUrl}:{})};
      let saved;
      if (current.data) saved = await db.from('videos').update(mediaFields).eq('id',current.data.id).select('id').single();
      else {
        saved = await db.from('videos').insert({ ...mediaFields,tiktok_video_id:source.id,video_url:source.url,
          title:typeof item.text==='string'?item.text.slice(0,4000):null,
          creator_handle:typeof item.authorMeta?.name==='string'?item.authorMeta.name.slice(0,100):null,
          creator_name:typeof item.authorMeta?.nickName==='string'?item.authorMeta.nickName.slice(0,200):null,
          // External analyses carry no verified commerce data and never enter rankings.
          country:null,rank:null,product_id:null,views:null,sales:null,revenue_mxn:null,roas:null,
          duration:Number.isFinite(item.videoMeta?.duration)?item.videoMeta.duration:null,
          snapshot_at:null,snapshot_date_range:null,
        }).select('id').single();
        // The unique TikTok ID can race with a manual catalogue import. Preserve it.
        if (saved.error?.code==='23505') {
          const imported = await db.from('videos').select('id').eq('tiktok_video_id',source.id).single();
          if (!imported.error) saved = await db.from('videos').update(mediaFields).eq('id',imported.data.id).select('id').single();
        }
      }
      if (saved.error || !saved.data?.id) throw new AIError('No se pudo guardar el video en el catálogo.',503);
      await update({status:'ready',video_id:saved.data.id,failure_message:null});
      return reply({status:'ready',videoId:saved.data.id});
    } catch (error) {
      // Transient fetch/storage errors resume the same run; invalid media is terminal.
      if (error instanceof AIError && error.status===422) await update({status:'failed',failure_message:error.message});
      else await update({poll_after:new Date(Date.now()+8000).toISOString()});
      throw error;
    }
  } catch (error) { return failure(error); }
});
