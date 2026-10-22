import { AIError } from './ai-contracts.ts';
export const MAX_DOWNLOAD_BYTES = 19 * 1024 * 1024;
export function canonicalTikTok(value: unknown) {
  let url: URL;
  try { url = new URL(String(value)); } catch { throw new AIError('Introduce un enlace completo de TikTok.', 400); }
  const match = url.pathname.match(/^\/@([a-zA-Z0-9._-]{1,100})\/video\/(\d{15,22})\/?$/);
  if (url.protocol !== 'https:' || !['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(url.hostname) || url.port || url.username || url.password || !match) {
    throw new AIError('Usa el enlace completo de TikTok con /video/ y el número del video.', 400);
  }
  return { id: match[2], url: `https://www.tiktok.com/@${match[1]}/video/${match[2]}` };
}
export function apifyId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9]{10,32}$/.test(value)) throw new AIError('El proveedor devolvió un identificador inválido.', 502);
  return value;
}
export function verifiedDownload(items: unknown, expectedId: string, storeId: string) {
  if (!Array.isArray(items) || items.length !== 1 || items[0]?.id !== expectedId) throw new AIError('El proveedor no encontró este video o devolvió otro distinto.', 422);
  const item = items[0];
  let media: URL;
  try { media = new URL(item.videoMeta?.downloadAddr); } catch { throw new AIError('Este video no permite descargar un MP4.', 422); }
  const expectedPrefix = `/v2/key-value-stores/${apifyId(storeId)}/records/`;
  if (media.origin !== 'https://api.apify.com' || media.username || media.password || media.search || media.hash || !media.pathname.startsWith(expectedPrefix) || !/^[a-zA-Z0-9._-]+\.mp4$/.test(media.pathname.slice(expectedPrefix.length)) || !media.pathname.endsWith(`-${expectedId}.mp4`)) {
    throw new AIError('La dirección del archivo no es válida para este video.', 422);
  }
  return { item, url: media.href };
}
export async function boundedMP4(response: Response): Promise<Uint8Array> {
  const length = response.headers.get('content-length');
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!response.ok || !response.body || !['video/mp4','application/octet-stream'].includes(type) || (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_DOWNLOAD_BYTES))) {
    await response.body?.cancel(); throw new AIError('El archivo no es MP4 o supera el límite de 19 MB.', 422);
  }
  // Keep one bounded destination instead of retaining every network chunk and
  // allocating a second whole-file buffer after the download.
  const capacity = length === null ? MAX_DOWNLOAD_BYTES : Number(length);
  const bytes = new Uint8Array(capacity); let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      const nextSize = size + value.byteLength;
      if (nextSize > MAX_DOWNLOAD_BYTES) throw new AIError('El video supera el límite de descarga de 19 MB.', 422);
      if (nextSize > capacity) throw new AIError('El archivo recibido no contiene un MP4 válido.', 422);
      bytes.set(value, size);
      size = nextSize;
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (size < 12 || new TextDecoder().decode(bytes.subarray(4,8)) !== 'ftyp' || (length !== null && Number(length) !== size)) throw new AIError('El archivo recibido no contiene un MP4 válido.', 422);
  return bytes.subarray(0, size);
}
