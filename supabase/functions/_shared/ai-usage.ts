/** Numeric provider metering only. Never persist prompt/response prose or credentials. */
export type AIUsageAttempt = {
  requestId: string; attempt: number; model: string; startedAt: number;
  httpStatus: number | null; succeeded: boolean; errorCode?: string | null; usage?: unknown;
};
const token = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1e12 ? value : null;
export function buildAIUsageRecord(event: AIUsageAttempt, now = Date.now()) {
  const usage = event.usage && typeof event.usage === 'object' ? event.usage as Record<string, unknown> : {};
  const input = token(usage.promptTokenCount);
  const output = token(usage.candidatesTokenCount);
  // The provider omits thoughtsTokenCount when there are no reasoning tokens.
  const thoughts = usage.thoughtsTokenCount === undefined ? 0 : token(usage.thoughtsTokenCount);
  const selectedModel = /^[a-z0-9.-]{1,100}$/.test(event.model) ? event.model : 'unknown';
  const priced = selectedModel === 'gemini-3.5-flash-lite' && input !== null && output !== null && thoughts !== null;
  return {
    request_id: event.requestId, attempt: event.attempt, model: selectedModel,
    started_at: new Date(event.startedAt).toISOString(), duration_ms: Math.max(0, Math.min(2147483647, Math.round(now - event.startedAt))),
    http_status: event.httpStatus, succeeded: event.succeeded,
    error_code: event.errorCode ? (/^[A-Z0-9_]{1,80}$/.test(event.errorCode) ? event.errorCode : 'UNKNOWN') : null,
    input_tokens: input, output_tokens: output, thinking_tokens: thoughts,
    estimated_cost_usd: priced ? (input * 0.30 + (output + thoughts) * 2.50) / 1e6 : null,
    pricing_reference: priced ? 'gemini-3.5-flash-lite-standard-2026-10-16' : null,
  };
}

/** Bounded best-effort write: an observability outage must not discard a valid creative. */
export async function recordAIUsage(event: AIUsageAttempt) {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('configuration');
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/ai_provider_usage`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2000),
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(buildAIUsageRecord(event)),
    });
    // No response body logging: the database might return sensitive request context.
    await response.body?.cancel();
    if (!response.ok) throw new Error('write');
  } catch { console.error('AI_USAGE_WRITE_FAILED'); }
}
