import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase/functions/_shared/gemini.ts', () => ({
  authenticatedAI:vi.fn(),
  failure:(error:Error)=>new Response(JSON.stringify({error:error.message}),{status:502}),
  headers:{},
  reply:(body:unknown)=>new Response(JSON.stringify(body)),
}));
const env={SUPABASE_URL:'https://example.supabase.co',APIFY_API_TOKEN:'test-token'};
const serve=vi.fn();
vi.stubGlobal('Deno',{serve,env:{get:(key:keyof typeof env)=>env[key]}});
await import('../supabase/functions/import-apify-batch/index');
const {authenticatedAI}=await import('../supabase/functions/_shared/gemini');
const handler=serve.mock.calls[0][0] as (request:Request)=>Promise<Response>;
const runId='completedRun001',datasetId='datasetTest001',storeId='storeTest001';
const ids=['7652957372519959828','7652957372519959829','7652957372519959830'];
const bytes=new Uint8Array([0,0,0,16,102,116,121,112,109,112,52,50,0,0,0,0]);
const item=(id:string)=>({id,videoMeta:{downloadAddr:`https://api.apify.com/v2/key-value-stores/${storeId}/records/video-${id}.mp4`}});

beforeEach(()=>vi.clearAllMocks());
afterAll(()=>vi.unstubAllGlobals());

function setup(rows:unknown[]){
  const saved=vi.fn().mockResolvedValue({error:null});
  const update=vi.fn(()=>({eq:saved}));
  const upload=vi.fn().mockResolvedValue({error:null});
  const from=vi.fn((table:string)=>{
    if(table==='user_roles'){
      const role={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:{role:'founder'},error:null})};
      role.select.mockReturnValue(role);role.eq.mockReturnValue(role);return role;
    }
    return {
      select:()=>({eq:(_key:string,id:string)=>({maybeSingle:async()=>({data:{id:`catalog-${id}`,video_mp4_url:id===ids[0]?`${env.SUPABASE_URL}/storage/v1/object/public/videos/catalog/${id}.mp4`:null},error:null})})}),
      update,
    };
  });
  vi.mocked(authenticatedAI).mockResolvedValue({db:{from,storage:{from:()=>({upload})}},userId:'founder'} as never);
  const fetcher=vi.fn(async(input:string|URL|Request)=>{
    const url=String(input);
    if(url.endsWith(`actor-runs/${runId}`))return Response.json({data:{id:runId,actId:'S5h7zRLfKFEr8pdj7',status:'SUCCEEDED',defaultDatasetId:datasetId,defaultKeyValueStoreId:storeId}});
    if(url.endsWith(`datasets/${datasetId}`))return Response.json({data:{itemCount:20}});
    if(url.includes('/items?'))return Response.json(rows);
    if(url.endsWith('.mp4'))return new Response(bytes,{headers:{'content-type':'video/mp4','content-length':'16'}});
    throw new Error('Unexpected request');
  });
  vi.stubGlobal('fetch',fetcher);
  return {fetcher,update,saved,upload};
}
const request=()=>new Request('https://example.test/import',{method:'POST',body:JSON.stringify({runId,offset:6})});

describe('bounded Apify import requests',()=>{
  it('requests only three records, skips owned media and only publishes media fields',async()=>{
    const {fetcher,update,saved,upload}=setup([item(ids[0]),item(ids[1]),{id:ids[2]}]);
    const response=await handler(request());
    expect(response.status).toBe(200);
    const result=await response.json();
    expect(result).toMatchObject({offset:6,nextOffset:9,complete:false,retry:false});
    expect(result.results.map((row:{status:string})=>row.status)).toEqual(['already_available','imported','unavailable']);
    expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('items?clean=true&offset=6&limit=3'))).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][1]).toEqual(bytes);
    expect(update).toHaveBeenCalledExactlyOnceWith({video_mp4_url:`${env.SUPABASE_URL}/storage/v1/object/public/videos/catalog/${ids[1]}.mp4`});
    expect(saved).toHaveBeenCalledExactlyOnceWith('id',`catalog-${ids[1]}`);
  });
  it('rejects a provider page exceeding the memory work limit before transferring media',async()=>{
    const {update,upload}=setup([...ids.map(item),item('7652957372519959831')]);
    expect((await handler(request())).status).toBe(502);
    expect(update).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it('keeps the offset after a storage failure so a retry cannot skip unpublished media',async()=>{
    const {upload,update}=setup([item(ids[1]),item(ids[2])]);
    upload.mockResolvedValueOnce({error:{message:'transient storage failure'}});
    const result=await (await handler(request())).json();
    expect(result).toMatchObject({offset:6,nextOffset:6,complete:false,retry:true});
    expect(result.results).toHaveLength(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });
});
