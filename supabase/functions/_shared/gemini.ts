import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AIError, parseGeminiResult } from './ai-contracts.ts';

export const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
export const failure = (error: unknown) => reply({ error: error instanceof AIError ? error.message : 'No se pudo completar la operación. Inténtalo de nuevo.' }, error instanceof AIError ? error.status : 500);
export const model = () => Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
export function geminiKey() {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new AIError('El análisis con Gemini está pendiente de configuración.', 503);
  return key;
}
export async function authenticatedAI(req: Request) {
  if (req.method !== 'POST') throw new AIError('Método no permitido.', 405);
  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new AIError('Inicia sesión para analizar videos.', 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new AIError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
  const entitlement = await db.rpc('is_paid_user', { _uid: data.user.id });
  if (entitlement.error) throw new AIError('No se pudo verificar tu acceso.', 503);
  if (!entitlement.data) throw new AIError('Necesitas una suscripción activa para usar el análisis.', 403);
  return { db, userId: data.user.id };
}
export async function reserve(db: any, userId: string, kind: 'video'|'text') {
  const { data, error } = await db.rpc('reserve_ai_call', { p_user_id: userId, p_kind: kind });
  if (error) throw new AIError('No se pudo verificar el límite de análisis.', 503);
  if (!data) throw new AIError('Llegaste al límite diario de análisis. Vuelve mañana.', 429);
}
export async function geminiJSON(parts: unknown[], temperature = 0.2) {
  const key = geminiKey();
  const selectedModel = model();
  if (!/^[a-z0-9.-]+$/.test(selectedModel)) throw new AIError('Modelo de Gemini no configurado correctamente.', 503);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens: 8192 } }),
    signal: AbortSignal.timeout(110000),
  });
  if (!response.ok) throw new AIError(response.status === 429 ? 'Gemini está ocupado o sin cuota. Inténtalo más tarde.' : 'No se pudo obtener el análisis de Gemini.', response.status === 429 ? 429 : 502);
  const payload = await response.json();
  const parsed = parseGeminiResult(payload);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AIError('Gemini devolvió un formato de análisis inválido.', 502);
  return { ...parsed, _provider_usage: payload.usageMetadata || null };
}
