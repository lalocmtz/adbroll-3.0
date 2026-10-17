export class AIError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export function ownedVideoUrl(value: unknown, base: string): string {
  if (typeof value !== 'string') throw new AIError('Este video todavía no tiene un archivo disponible.', 409);
  const url = new URL(value);
  if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/storage/v1/object/public/videos/') || url.username || url.password || url.search || url.hash) {
    throw new AIError('El archivo del video todavía no está listo en el catálogo propio.', 409);
  }
  return url.href;
}

export function parseGeminiResult(data: any): any {
  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') throw new AIError('No se pudo completar el análisis. Inténtalo de nuevo.', 502);
  try {
    return JSON.parse(candidate.content.parts.filter((part: any) => !part.thought).map((part: any) => part.text || '').join(''));
  } catch { throw new AIError('El resultado llegó incompleto. No se guardó como análisis.', 502); }
}

export function validateVideoAnalysis(result: any) {
  if (!result || !['transcript','hook','body','cta'].every(key => typeof result[key] === 'string') ||
      !['visual_observations','beginner_takeaways','uncertainties'].every(key => Array.isArray(result[key]) && result[key].every((s: unknown) => typeof s === 'string')) ||
      !Array.isArray(result.segments) || !result.segments.every((s: any) => typeof s.text === 'string' && Number.isFinite(s.start_seconds) && Number.isFinite(s.end_seconds) && s.start_seconds >= 0 && s.end_seconds >= s.start_seconds) ||
      (!result.transcript.trim() && !result.visual_observations.length)) {
    throw new AIError('El análisis recibido no está completo. No se guardó.', 502);
  }
  return result;
}

export function scriptInput(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 30000) throw new AIError('Introduce un guion de hasta 30,000 caracteres.', 400);
  return value.trim();
}

// A valid base analysis does not depend on creative variants. Preserve legacy
// shared analyses instead of paying to regenerate them after deployment.
export function isReusableBase(video: any, source: string): boolean {
  if (typeof video?.transcript !== 'string' || !video.analysis_json) return false;
  const cache = video.analysis_json._cache;
  if (cache?.source && cache.source !== source) return false;
  if (!cache && video.transcript.trim() && ['hook','body','cta'].every(key => video.analysis_json[key] === null || typeof video.analysis_json[key] === 'string') && ['hook','body','cta'].some(key => typeof video.analysis_json[key] === 'string' && video.analysis_json[key].trim())) return true;
  try { validateVideoAnalysis({ ...video.analysis_json, transcript: video.transcript }); return true; }
  catch { return false; }
}
export class GeminiProviderError extends AIError {
  constructor(public providerStatus: number, public providerCode: string, public retryAfterSeconds: number | null = null, public quotaWindow: 'day'|'minute'|'unknown' = 'unknown') {
    super(providerStatus===429 ? 'El servicio de análisis alcanzó su cuota temporal. Inténtalo de nuevo más tarde.' :
      providerStatus===401 || providerStatus===403 ? 'El servicio de análisis necesita una revisión de acceso por el administrador.' :
      providerStatus===400 || providerStatus===404 ? 'No se pudo procesar este archivo con la configuración actual.' :
      'El análisis tuvo un fallo temporal. Vuelve a intentarlo en unos minutos.', providerStatus===429?429:502);
  }
  get retryable() { return this.providerStatus===429 || this.providerStatus>=500; }
}
export function safeGeminiCode(payload: any): string {
  const code=payload?.error?.status;
  return typeof code==='string' && /^[A-Z_]{3,40}$/.test(code)?code:'UNKNOWN';
}

/** Only bounded retry timing and a closed quota category may leave the provider response. */
export function safeGeminiRetry(payload: any, retryAfter: string | null, now = Date.now()) {
  const waits: number[] = [];
  const add = (seconds: number) => { if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 604800) waits.push(Math.ceil(seconds)); };
  if (retryAfter) {
    if (/^\d+(?:\.\d+)?$/.test(retryAfter)) add(Number(retryAfter));
    else { const date = Date.parse(retryAfter); if (Number.isFinite(date)) add((date-now)/1000); }
  }
  let quotaWindow: 'day'|'minute'|'unknown' = 'unknown';
  for (const detail of Array.isArray(payload?.error?.details) ? payload.error.details : []) {
    if (detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && typeof detail.retryDelay === 'string' && /^\d+(?:\.\d+)?s$/.test(detail.retryDelay)) add(Number(detail.retryDelay.slice(0,-1)));
    if (detail?.['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure') {
      for (const violation of Array.isArray(detail.violations) ? detail.violations : []) {
        // Do not log identifiers/dimensions: they can include project information.
        if (typeof violation?.quotaId !== 'string') continue;
        if (/PerDay/.test(violation.quotaId)) quotaWindow = 'day';
        else if (/PerMinute/.test(violation.quotaId) && quotaWindow !== 'day') quotaWindow = 'minute';
      }
    }
  }
  return { retryAfterSeconds: waits.length ? Math.max(...waits) : null, quotaWindow };
}
