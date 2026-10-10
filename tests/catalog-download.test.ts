import { describe, expect, it } from 'vitest';
import { apifyId, boundedMP4, canonicalTikTok, MAX_DOWNLOAD_BYTES, verifiedDownload } from '../supabase/functions/_shared/download-contracts';
const id = '7652957372519959828';
const store = 'DfXrZDQbBMMU8QcDk';
const media = `https://api.apify.com/v2/key-value-stores/${store}/records/video-julietaskin-20260101000000-${id}.mp4`;
const row = {id, videoMeta:{downloadAddr:media}};
const bytes = new Uint8Array([0,0,0,16,102,116,121,112,109,112,52,50,0,0,0,0]);
describe('catalogue download boundaries',()=>{
  it('canonicalizes a full TikTok link without forwarding tracking parameters',()=>{
    expect(canonicalTikTok(`https://m.tiktok.com/@julietaskin/video/${id}?token=discard#fragment`)).toEqual({id,url:`https://www.tiktok.com/@julietaskin/video/${id}`});
    for(const url of [`http://www.tiktok.com/@a/video/${id}`,`https://www.tiktok.com.evil.test/@a/video/${id}`,`https://user:pass@www.tiktok.com/@a/video/${id}`,`https://www.tiktok.com:123/@a/video/${id}`,'https://vm.tiktok.com/abc',`https://www.tiktok.com/@a/video/${id}/../other`]) expect(()=>canonicalTikTok(url)).toThrow();
  });
  it('matches the requested ID and run store before accepting a downloadable result',()=>{
    expect(verifiedDownload([row],id,store).url).toBe(media);
    for(const rows of [[],[row,row],[{...row,id:'7652957372519959829'}],[{...row,videoMeta:{downloadAddr:media.replace(store,'differentStoreId')}}],[{...row,videoMeta:{downloadAddr:media.replace('api.apify.com','evil.test')}}],[{...row,videoMeta:{downloadAddr:media+'?token=secret'}}],[{...row,videoMeta:{downloadAddr:media.replace(`-${id}.mp4`,'-other.mp4')}}]]) expect(()=>verifiedDownload(rows,id,store)).toThrow();
    expect(()=>apifyId('../secrets')).toThrow();
  });
  it('requires a bounded complete MP4 and rejects HTML or wrong file magic',async()=>{
    expect(await boundedMP4(new Response(bytes,{headers:{'content-type':'video/mp4','content-length':String(bytes.length)}}))).toEqual(bytes);
    for(const response of [new Response(bytes,{headers:{'content-type':'text/html'}}),new Response(new Uint8Array(16),{headers:{'content-type':'video/mp4'}}),new Response(bytes,{headers:{'content-type':'video/mp4','content-length':String(MAX_DOWNLOAD_BYTES+1)}}),new Response(bytes,{headers:{'content-type':'video/mp4','content-length':'99'}})]) await expect(boundedMP4(response)).rejects.toThrow();
  });
  it('enforces the byte cap even when a server omits content-length',async()=>{
    const large = new Uint8Array(MAX_DOWNLOAD_BYTES+1);
    await expect(boundedMP4(new Response(large,{headers:{'content-type':'application/octet-stream'}}))).rejects.toThrow('19 MB');
  });
});
