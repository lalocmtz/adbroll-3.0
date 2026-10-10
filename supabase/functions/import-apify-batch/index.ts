import { AIError, ownedVideoUrl } from '../_shared/ai-contracts.ts';
import { authenticatedAI, failure, headers, reply } from '../_shared/gemini.ts';
import { apifyId, boundedMP4, verifiedDownload } from '../_shared/download-contracts.ts';

// Import a completed owner-run batch. This endpoint never starts billable runs.
// Fetch metadata once per 12 records, but hold at most three MP4 transfers at once.
// A completed group is the resume boundary; unprocessed records stay on the next page.
export async function processBatchGroups<T, R extends { status: string }>(
  rows: T[], processItem: (item: T) => Promise<R>, startedAt: number, now = Date.now,
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < rows.length; index += 3) {
    const group = await Promise.all(rows.slice(index, index + 3).map(processItem));
    results.push(...group);
    if (group.some(row => row.status === 'retry') || now() - startedAt >= 75000) break;
  }
  return results;
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    const startedAt = Date.now();
    const { db, userId } = await authenticatedAI(req);
    const role = await db.from('user_roles').select('role').eq('user_id', userId).eq('role', 'founder').maybeSingle();
    if (role.error || !role.data) throw new AIError('Solo el fundador puede importar lotes.', 403);
    const body = await req.json();
    const runId = apifyId(body.runId);
    const offset = body.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new AIError('Posición de importación inválida.', 400);
    const key = Deno.env.get('APIFY_API_TOKEN');
    if (!key) throw new AIError('Apify no está configurado.', 503);
    const api = async (path: string) => {
      const response = await fetch(`https://api.apify.com/v2/${path}`, { headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new AIError('No se pudo leer el lote de Apify. Verifica el ID y el acceso de la cuenta.', 503);
      return response.json();
    };
    const run = (await api(`actor-runs/${runId}`)).data;
    if (run?.id !== runId || run.actId !== 'S5h7zRLfKFEr8pdj7' || run.status !== 'SUCCEEDED') throw new AIError('Se necesita un lote terminado de clockworks/tiktok-video-scraper.', 409);
    const datasetId = apifyId(run.defaultDatasetId), storeId = apifyId(run.defaultKeyValueStoreId);
    const dataset = (await api(`datasets/${datasetId}`)).data;
    const total = dataset?.itemCount;
    if (!Number.isSafeInteger(total) || total < 0 || total > 100000) throw new AIError('El lote tiene un tamaño inválido.', 422);
    const rows = await api(`datasets/${datasetId}/items?clean=true&offset=${offset}&limit=12`);
    if (!Array.isArray(rows) || rows.length > 12 || (!rows.length && offset < total)) throw new AIError('El lote no devolvió la página esperada.', 502);
    const results = await processBatchGroups(rows, async (item: any) => {
      const id = typeof item.id === 'string' && /^\d{15,22}$/.test(item.id) ? item.id : null;
      try {
        if (!id) return { id, status: 'unavailable' };
        const existing = await db.from('videos').select('id,video_mp4_url').eq('tiktok_video_id', id).maybeSingle();
        if (existing.error) throw new AIError('No se pudo consultar el catálogo.', 503);
        // Excel is the source of sales and product identities; never invent them.
        if (!existing.data) return { id, status: 'missing_catalog' };
        if (existing.data.video_mp4_url) {
          try { ownedVideoUrl(existing.data.video_mp4_url, Deno.env.get('SUPABASE_URL')!); return { id, status: 'already_available' }; } catch { /* migrate foreign media */ }
        }
        const { url } = verifiedDownload([item], id, storeId);
        const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(45000) });
        const bytes = await boundedMP4(response);
        const path = `catalog/${id}.mp4`;
        const uploaded = await db.storage.from('videos').upload(path, bytes, { contentType: 'video/mp4', cacheControl: '31536000', upsert: true });
        if (uploaded.error) throw new AIError('Falló el almacenamiento; reintenta esta página.', 503);
        const saved = await db.from('videos').update({ video_mp4_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/videos/${path}` }).eq('id', existing.data.id);
        if (saved.error) throw new AIError('No se pudo publicar el archivo; reintenta esta página.', 503);
        return { id, status: 'imported', bytes: bytes.byteLength };
      } catch (error) {
        return { id, status: error instanceof AIError && error.status === 422 ? 'unavailable' : 'retry', error: error instanceof AIError ? error.message : 'No se pudo transferir el archivo.' };
      }
    }, startedAt);
    // Retry the same page after a transient error; successful rows are skipped.
    const retry = results.some(row => row.status === 'retry');
    const nextOffset = retry ? offset : offset + results.length;
    return reply({ runId, total, offset, nextOffset, complete: !retry && nextOffset >= total, retry, results });
  } catch (error) { return failure(error); }
});
