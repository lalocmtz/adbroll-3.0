import { describe, expect, it } from 'vitest';
import { ownedVideoUrl, parseGeminiResult, validateVideoAnalysis } from '../supabase/functions/_shared/ai-contracts';

const base = 'https://owned.supabase.co';
describe('owned AI analysis boundaries', () => {
  it('accepts only media in the owned catalogue bucket', () => {
    expect(ownedVideoUrl(`${base}/storage/v1/object/public/videos/a.mp4`, base)).toContain('/videos/a.mp4');
    for (const url of ['http://127.0.0.1/private', `${base}.attacker.com/storage/v1/object/public/videos/a.mp4`, `${base}/storage/v1/object/public/user-library/private.mp4`, `${base}/storage/v1/object/public/videos/a.mp4?token=secret`]) {
      expect(() => ownedVideoUrl(url, base)).toThrow();
    }
  });
  it('rejects truncated, blocked and malformed provider responses instead of inventing insights', () => {
    for (const finishReason of ['MAX_TOKENS', 'SAFETY', undefined]) expect(() => parseGeminiResult({ candidates: [{ finishReason, content: { parts: [{ text: '{}' }] } }] })).toThrow();
    expect(() => parseGeminiResult({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } }] })).toThrow();
    expect(parseGeminiResult({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'hidden reasoning' }, { text: '{"ok":true}' }] } }] })).toEqual({ ok: true });
  });
  it('requires useful observations and valid timestamps', () => {
    const valid = { transcript: '', hook: '', body: '', cta: '', segments: [], visual_observations: ['Se muestra el producto.'], beginner_takeaways: [], uncertainties: ['No hay voz audible.'] };
    expect(validateVideoAnalysis(valid)).toEqual(valid);
    expect(() => validateVideoAnalysis({ ...valid, visual_observations: [] })).toThrow();
    expect(() => validateVideoAnalysis({ ...valid, segments: [{ text: 'hola', start_seconds: 3, end_seconds: 1 }] })).toThrow();
  });
});

import { GeminiProviderError, isReusableBase, safeGeminiCode } from '../supabase/functions/_shared/ai-contracts';
describe('shared base analysis and safe provider errors',()=>{
 it('reuses legacy base without variants and refuses changed media',()=>{
  const video={transcript:'Guion real',analysis_json:{hook:'Gancho',body:'Cuerpo',cta:null},variants_json:null};
  expect(isReusableBase(video,'owned.mp4')).toBe(true);
  expect(isReusableBase({...video,transcript:''},'owned.mp4')).toBe(false);
  expect(isReusableBase({...video,analysis_json:{...video.analysis_json,_cache:{source:'old.mp4'}}},'owned.mp4')).toBe(false);
  expect(isReusableBase({...video,analysis_json:{hook:'Gancho',body:42,cta:null}},'owned.mp4')).toBe(false);
 });
 it('reuses a complete modern analysis without demanding generated variants',()=>{
  const analysis={hook:'Gancho',body:'Cuerpo',cta:'Cierre',segments:[],visual_observations:['Se ve el producto'],beginner_takeaways:[],uncertainties:[],_cache:{source:'owned.mp4',prompt_version:'tokxray-creative-v2'}};
  expect(isReusableBase({transcript:'',analysis_json:analysis,variants_json:null},'owned.mp4')).toBe(true);
 });
 it('classifies retryable provider errors without including provider prose',()=>{
  expect(new GeminiProviderError(503,'UNAVAILABLE').retryable).toBe(true);
  expect(new GeminiProviderError(429,'RESOURCE_EXHAUSTED').retryable).toBe(true);
  expect(new GeminiProviderError(400,'INVALID_ARGUMENT').retryable).toBe(false);
  expect(new GeminiProviderError(403,'PERMISSION_DENIED').retryable).toBe(false);
  expect(safeGeminiCode({error:{status:'INVALID_ARGUMENT',message:'secret request'}})).toBe('INVALID_ARGUMENT');
  expect(safeGeminiCode({error:{status:'secret/token:abc'}})).toBe('UNKNOWN');
 });
});
