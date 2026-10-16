import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apifyErrorLog, apifyResponseError, downloadStartFailure } from '../supabase/functions/_shared/apify-errors';

const state = vi.hoisted(() => ({ handler: null as null | ((request: Request) => Promise<Response>), updates: [] as Record<string, unknown>[], existingStatus: '' }));
vi.mock('../supabase/functions/_shared/gemini.ts', () => ({
  headers: {},
  reply: (body: unknown, status = 200) => new Response(JSON.stringify(body), {status}),
  failure: (error: {message: string; status?: number}) => new Response(JSON.stringify({error:error.message}), {status:error.status || 500}),
  authenticatedAI: async () => ({userId:'paid-user', db: {
    from: (table: string) => {
      if (table === 'videos') { const q = {select:()=>q,eq:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null})}; return q; }
      return {update:(value: Record<string, unknown>) => {
        state.updates.push(value);
        const q = {eq:()=>q,then:(resolve: (value: unknown) => void)=>resolve({error:null})}; return q;
      }};
    },
    rpc: async () => ({data:{started:!state.existingStatus, job:{status:state.existingStatus, failure_message:'Descargas pausadas: se agotó el límite de uso del proveedor.'}},error:null}),
  }}),
}));
vi.mock('../supabase/functions/_shared/catalog-posters.ts',()=>({storeCatalogPoster:vi.fn()}));
vi.stubGlobal('Deno',{serve:(handler: typeof state.handler)=>{state.handler=handler;},env:{get:()=> 'private-test-token'}});
await import('../supabase/functions/catalog-download/index');

const request = () => new Request('https://app.example/catalog-download',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({videoUrl:'https://www.tiktok.com/@creator/video/7697123951268384021'})});
const response = (status: number, type = 'usage-limit-exceeded') => new Response(JSON.stringify({error:{type,message:'secret https://api.example/?token=private-test-token'}}),{status});

describe('provider rejection recovery and privacy',()=>{
  beforeEach(()=>{ state.updates=[]; state.existingStatus=''; vi.restoreAllMocks(); });
  it.each([402,403])('records a definite billing refusal (%i) and stops client polling',async status=>{
    const fetch = vi.fn().mockResolvedValue(response(status)); vi.stubGlobal('fetch',fetch);
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const result=await state.handler!(request());
    expect(result.status).toBe(422);
    expect(await result.json()).toEqual({error:'Descargas pausadas: se agotó el límite de uso del proveedor.'});
    expect(state.updates[0]).toMatchObject({status:'rejected'});
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith('catalog_download_provider',{status,type:'usage-limit-exceeded'});
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private-test-token|api\.example|secret/);
  });
  it.each([408,500,503])('retains a durable unknown reservation for ambiguous HTTP %i',async status=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(status,'internal-error')));
    vi.spyOn(console,'warn').mockImplementation(()=>{});
    const result=await state.handler!(request());
    expect(result.status).toBe(503);
    expect(state.updates[0]).toMatchObject({status:'unknown'});
    expect(await result.text()).toContain('Contacta a soporte');
  });
  it('does not restart a request whose network response was lost',async()=>{
    const fetch=vi.fn().mockRejectedValue(new Error('timeout token=private-test-token')); vi.stubGlobal('fetch',fetch);
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const result=await state.handler!(request());
    expect(result.status).toBe(503);
    expect(state.updates[0]).toMatchObject({status:'unknown'});
    expect(await result.text()).not.toContain('private-test-token');
    expect(warning).toHaveBeenCalledWith('catalog_download_provider',{status:null,type:'network-error'});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not start or poll a rejected job until the reservation RPC explicitly permits it',async()=>{
    state.existingStatus='rejected'; const fetch=vi.fn(); vi.stubGlobal('fetch',fetch);
    const result=await state.handler!(request());
    expect(result.status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });
  it('redacts arbitrary error type strings and handles non-JSON definite rejections',async()=>{
    const error=await apifyResponseError(response(403,'private-test-token'));
    expect(apifyErrorLog(error)).toEqual({status:403,type:'unknown'});
    expect(downloadStartFailure(error).status).toBe('rejected');
    const html=await apifyResponseError(new Response('<html>private-test-token</html>',{status:429}));
    expect(apifyErrorLog(html)).toEqual({status:429,type:'unknown'});
    expect(downloadStartFailure(html).status).toBe('rejected');
  });
});
