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
  if (candidate?.finishReason !== 'STOP') throw new AIError('Gemini no pudo completar el análisis. Inténtalo de nuevo.', 502);
  try {
    return JSON.parse(candidate.content.parts.filter((part: any) => !part.thought).map((part: any) => part.text || '').join(''));
  } catch { throw new AIError('Gemini devolvió un resultado incompleto. No se guardó como análisis.', 502); }
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
