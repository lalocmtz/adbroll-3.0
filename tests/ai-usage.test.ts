import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAIUsageRecord, recordAIUsage } from '../supabase/functions/_shared/ai-usage';
const base = {requestId:'00000000-0000-4000-8000-000000000001',attempt:1,model:'gemini-3.5-flash-lite',startedAt:0,httpStatus:200,succeeded:true};
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('private provider metering', () => {
  it('whitelists numeric tokens and preserves no prompt/provider prose', () => {
    const row = buildAIUsageRecord({...base,usage:{promptTokenCount:10000,candidatesTokenCount:1500,thoughtsTokenCount:500,text:'PRIVATE',key:'SECRET'}}, 123);
    expect(row).toMatchObject({estimated_cost_usd:0.008,thinking_tokens:500,duration_ms:123});
    expect(JSON.stringify(row)).not.toMatch(/PRIVATE|SECRET/);
  });
  it('does not interpret missing tokens or an unknown price as free usage', () => {
    expect(buildAIUsageRecord(base).estimated_cost_usd).toBeNull();
    expect(buildAIUsageRecord({...base,usage:{promptTokenCount:10,candidatesTokenCount:0}}).estimated_cost_usd).toBe(0.000003);
    expect(buildAIUsageRecord({...base,usage:{promptTokenCount:NaN,candidatesTokenCount:-1,thoughtsTokenCount:'secret'}}).estimated_cost_usd).toBeNull();
    expect(buildAIUsageRecord({...base,model:'new-model',usage:{promptTokenCount:10,candidatesTokenCount:5}}).estimated_cost_usd).toBeNull();
    expect(buildAIUsageRecord({...base,errorCode:'secret response text'}).error_code).toBe('UNKNOWN');
  });
  it('writes server-only with a bounded timeout and no response body logs', async () => {
    vi.stubGlobal('Deno',{env:{get:(key:string)=>key==='SUPABASE_URL'?'https://owned.supabase.co':'private-service-key'}});
    const fetcher=vi.fn().mockResolvedValue(new Response(null,{status:201}));vi.stubGlobal('fetch',fetcher);
    await recordAIUsage(base);
    const [url,request]=fetcher.mock.calls[0];
    expect(url).toBe('https://owned.supabase.co/rest/v1/ai_provider_usage');
    expect(request.redirect).toBe('error');expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(request.headers.Authorization).toBe('Bearer private-service-key');
    expect(JSON.parse(request.body).request_id).toBe(base.requestId);
  });
  it.each(['network','http','missingConfig'])('does not block the creative on %s metering failure', async mode => {
    vi.stubGlobal('Deno',{env:{get:()=>mode==='missingConfig'?undefined:'private-value'}});
    vi.stubGlobal('fetch',mode==='network'?vi.fn().mockRejectedValue(new Error('SECRET')):vi.fn().mockResolvedValue(new Response('PRIVATE',{status:403})));
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    await expect(recordAIUsage(base)).resolves.toBeUndefined();
    expect(log.mock.calls).toEqual([['AI_USAGE_WRITE_FAILED']]);
  });
});
