import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('https://esm.sh/@supabase/supabase-js@2.49.1',()=>({createClient:vi.fn()}));
const record=vi.hoisted(()=>vi.fn().mockResolvedValue(undefined));
vi.mock('../supabase/functions/_shared/ai-usage.ts',()=>({recordAIUsage:record}));
import { geminiJSON } from '../supabase/functions/_shared/gemini';
const usage={promptTokenCount:123,candidatesTokenCount:45};
const good={usageMetadata:usage,candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}]};
beforeEach(()=>{record.mockClear();vi.stubGlobal('Deno',{env:{get:(k:string)=>k==='GEMINI_MODEL'?'gemini-3.5-flash-lite':'private-key'}});vi.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
describe('all Gemini attempts are metered',()=>{
 it('records a successful response without persisting generated content',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(good)));
  expect(await geminiJSON([{text:'PRIVATE PROMPT'}])).toMatchObject({ok:true});
  expect(record).toHaveBeenCalledOnce();expect(record.mock.calls[0][0]).toMatchObject({succeeded:true,httpStatus:200,usage});
  expect(JSON.stringify(record.mock.calls)).not.toContain('PRIVATE PROMPT');
 });
 it('records transient failure and successful retry as separate attempts in one group',async()=>{
  vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({error:{status:'UNAVAILABLE',message:'PRIVATE'}},{status:503})).mockResolvedValueOnce(Response.json(good)));
  const result=geminiJSON([]);await vi.advanceTimersByTimeAsync(1300);await result;
  expect(record).toHaveBeenCalledTimes(2);
  const [a,b]=record.mock.calls.map(call=>call[0]);
  expect(a).toMatchObject({attempt:1,httpStatus:503,succeeded:false,errorCode:'UNAVAILABLE'});expect(b).toMatchObject({attempt:2,succeeded:true});
  expect(a.requestId).toBe(b.requestId);expect(JSON.stringify(record.mock.calls)).not.toContain('PRIVATE');
 });
 it.each([null,{usageMetadata:usage,candidates:[{finishReason:'STOP',content:{parts:[{text:'not-json'}]}}]}])('records HTTP200 invalid payload before returning error',async payload=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(payload)));
  await expect(geminiJSON([])).rejects.toThrow();
  expect(record).toHaveBeenCalledOnce();expect(record.mock.calls[0][0]).toMatchObject({httpStatus:200,succeeded:false,errorCode:'INVALID_PROVIDER_RESPONSE'});
 });
 it('records network failure with unknown HTTP status and no invented tokens',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('secret network error')));
  await expect(geminiJSON([])).rejects.toThrow();
  expect(record.mock.calls[0][0]).toMatchObject({httpStatus:null,succeeded:false,errorCode:'NETWORK_ERROR'});
  expect(record.mock.calls[0][0].usage).toBeUndefined();
 });
});
