import {describe,expect,it,vi,afterEach} from 'vitest';
import {readPoster,storeCatalogPoster,trustedPosterUrl} from '../supabase/functions/_shared/catalog-posters';
const id='7676317880882875655';
const url='https://p19-common-sign.tiktokcdn-us.com/video.jpg?x-signature=existing';
afterEach(()=>vi.restoreAllMocks());
describe('owned catalogue posters',()=>{
 it('accepts only known HTTPS TikTok CDN URLs',()=>{
  expect(trustedPosterUrl(url)).toBe(url);
  for(const v of ['http://p19.tiktokcdn.com/a','https://tiktokcdn.com.evil.test/a','https://127.0.0.1/a','https://user:pass@p19.tiktokcdn.com/a','https://p19.tiktokcdn.com:444/a'])expect(()=>trustedPosterUrl(v)).toThrow();
 });
 it('checks MIME, image signature and stream size independently',async()=>{
  const jpg=new Uint8Array([255,216,255,224]);
  expect((await readPoster(new Response(jpg,{headers:{'content-type':'image/jpeg'}}))).extension).toBe('jpg');
  await expect(readPoster(new Response('html',{headers:{'content-type':'image/jpeg'}}))).rejects.toThrow();
  await expect(readPoster(new Response(jpg,{headers:{'content-type':'text/html'}}))).rejects.toThrow();
  await expect(readPoster(new Response(new Uint8Array(2*1024*1024+1),{headers:{'content-type':'image/png'}}))).rejects.toThrow('POSTER_TOO_LARGE');
 });
 it('copies an existing cover with no credentials and publishes only the owned URL',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([255,216,255,224]),{headers:{'content-type':'image/jpeg'}}));
  const upload=vi.fn().mockResolvedValue({error:null});const from=vi.fn().mockReturnValue({upload});
  const result=await storeCatalogPoster({storage:{from}},{id,videoMeta:{coverUrl:url}},id,'https://owned.supabase.co');
  expect(result).toBe(`https://owned.supabase.co/storage/v1/object/public/thumbnails/catalog/${id}.jpg`);
  expect(fetchMock.mock.calls[0][1]?.redirect).toBe('error');
  expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined();
  expect(from).toHaveBeenCalledWith('thumbnails');
 });
 it('makes missing or expired covers nonfatal and refuses wrong video identity',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(null,{status:403}));
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  expect(await storeCatalogPoster({}, {id,videoMeta:{coverUrl:url}},id,'https://owned.supabase.co')).toBeNull();
  fetchMock.mockClear();
  expect(await storeCatalogPoster({}, {id:'999'},id,'https://owned.supabase.co')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
 });
});
