import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AIError, GeminiProviderError } from '../_shared/ai-contracts.ts';
import { analyzeOwnedVideo } from '../_shared/analyze-owned-video.ts';
import { reply } from '../_shared/gemini.ts';
// verify_jwt=false is intentional: pg_cron supplies a private, random one-use job
// capability. No user/anon request can claim work or choose a provider prompt.
Deno.serve(async req=>{
 if(req.method!=='POST') return reply({error:'Método no permitido.'},405);
 let body;try{body=await req.json();}catch{return reply({error:'Solicitud inválida.'},400);}
 const {videoId,token}=body;
 if(typeof videoId!=='string'||!/^[0-9a-f-]{36}$/i.test(videoId)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)) return reply({error:'Trabajo inválido.'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const claim=await db.rpc('claim_catalog_analysis_job',{p_video_id:videoId,p_token:token});
 if(claim.error||!claim.data) return reply({error:'Trabajo no disponible.'},401);
 try{
  const current=await db.from('videos').select('video_mp4_url').eq('id',videoId).single();
  if(current.error||current.data?.video_mp4_url!==claim.data.sourceUrl) throw new AIError('El archivo cambió.',409);
  const result=await analyzeOwnedVideo(db,videoId);
  const usage=result.analysis?._cache?.usage;
  await db.rpc('finish_catalog_analysis_job',{p_video_id:videoId,p_token:token,p_success:true,p_retryable:false,p_error_code:null,
   p_input_tokens:Number.isSafeInteger(usage?.promptTokenCount)?usage.promptTokenCount:null,
   p_output_tokens:Number.isSafeInteger(usage?.candidatesTokenCount)?usage.candidatesTokenCount+(usage.thoughtsTokenCount||0):null});
  return reply({success:true,videoId,cached:result.cached});
 }catch(error){
  const code=error instanceof GeminiProviderError?`GEMINI_${error.providerStatus}_${error.providerCode}`:error instanceof AIError?`PROCESS_${error.status}`:'NETWORK_ERROR';
  const retryable=error instanceof GeminiProviderError?error.retryable:!(error instanceof AIError)||[409,429,502,503].includes(error.status);
  await db.rpc('finish_catalog_analysis_job',{p_video_id:videoId,p_token:token,p_success:false,p_retryable:retryable,p_error_code:code});
  console.error('Catalogue analysis failed',JSON.stringify({videoId,code,attempt:claim.data.attempt}));
  // Ack job; durable queue controls retries, not HTTP callers.
  return reply({success:false,videoId,code});
 }
});
