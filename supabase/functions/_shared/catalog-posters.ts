// Existing scraper covers expire. Copy a small verified image into owned storage
// while its signed CDN URL is fresh; never start an extra scraper/provider run.
const MAX_POSTER_BYTES=2*1024*1024;
export function trustedPosterUrl(value: unknown): string {
 const url=new URL(typeof value==='string'?value:'');
 if(url.protocol!=='https:'||url.port||url.username||url.password||url.hash||
   !/(^|\.)(tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com)$/.test(url.hostname)) throw new Error('INVALID_POSTER_HOST');
 return url.href;
}
export async function readPoster(response: Response): Promise<{bytes:Uint8Array;type:string;extension:string}> {
 const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 const length=response.headers.get('content-length');
 if(!response.ok||!response.body||!['image/jpeg','image/png','image/webp'].includes(type)||
  (length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_POSTER_BYTES))){
  await response.body?.cancel();throw new Error('INVALID_POSTER_RESPONSE');
 }
 const chunks:Uint8Array[]=[];let count=0;
 const reader=response.body.getReader();
 try{
  while(true){const {value,done}=await reader.read();if(done)break;count+=value.length;
   if(count>MAX_POSTER_BYTES)throw new Error('POSTER_TOO_LARGE');chunks.push(value);}
 }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(count);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const signature=(type==='image/jpeg'&&count>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||
  (type==='image/png'&&count>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))||
  (type==='image/webp'&&count>=12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP');
 if(!signature||(length!==null&&Number(length)!==count))throw new Error('INVALID_POSTER_BYTES');
 return {bytes,type,extension:type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp'};
}
export async function storeCatalogPoster(db:any,item:any,id:string,base:string):Promise<string|null>{
 try{
  if(!/^\d{15,22}$/.test(id)||item?.id!==id)throw new Error('INVALID_POSTER_ID');
  const url=trustedPosterUrl(item.videoMeta?.coverUrl);
  // Do not send provider/API credentials to a CDN. Refuse redirects entirely.
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
  const {bytes,type,extension}=await readPoster(response);
  const path=`catalog/${id}.${extension}`;
  const upload=await db.storage.from('thumbnails').upload(path,bytes,{contentType:type,upsert:true,cacheControl:'31536000'});
  if(upload.error)throw new Error('POSTER_STORAGE_FAILED');
  return `${new URL(base).origin}/storage/v1/object/public/thumbnails/${path}`;
 }catch{
  // A missing/expired cover must not discard a successfully downloaded video.
  console.warn('Catalogue poster unavailable',JSON.stringify({videoId:id}));return null;
 }
}
