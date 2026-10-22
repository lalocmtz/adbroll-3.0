import { afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('../supabase/functions/_shared/gemini.ts', () => ({ authenticatedAI:vi.fn(),failure:vi.fn(),headers:{},reply:vi.fn() }));
vi.stubGlobal('Deno',{serve:vi.fn()});
const {processBatchGroups}=await import('../supabase/functions/import-apify-batch/index');
afterAll(()=>vi.unstubAllGlobals());
describe('bounded bulk download groups',()=>{
  it('never holds concurrent MP4 transfers, even if given a longer metadata list',async()=>{
    let active=0,maxActive=0;
    const rows=Array.from({length:12},(_,i)=>i);
    const results=await processBatchGroups(rows,async id=>{
      active++;maxActive=Math.max(maxActive,active);
      await Promise.resolve();active--;
      return {id,status:'imported'};
    },0,()=>0);
    expect(maxActive).toBe(1);
    expect(results.map(row=>row.id)).toEqual(rows);
  });
  it('returns only completed records when elapsed work reaches 75 seconds',async()=>{
    let elapsed=0;
    const results=await processBatchGroups(Array.from({length:12},(_,i)=>i),async id=>{
      elapsed+=40000;
      return {id,status:'imported'};
    },0,()=>elapsed);
    expect(results.map(row=>row.id)).toEqual([0,1]);
    // Caller advances by actual results, preserving rows 2–11 for the next request.
    expect(100+results.length).toBe(102);
  });
  it('stops after a transient failure so the same offset can safely be retried',async()=>{
    const processed:number[]=[];
    const results=await processBatchGroups(Array.from({length:12},(_,i)=>i),async id=>{
      processed.push(id);return {id,status:id===1?'retry':'imported'};
    },0,()=>0);
    expect(processed).toEqual([0,1]);
    expect(results.some(row=>row.status==='retry')).toBe(true);
  });
  it('keeps permanent unavailable results and completes a short final group',async()=>{
    const results=await processBatchGroups([0,1,2,3],async id=>({id,status:id===1?'unavailable':'already_available'}),0,()=>0);
    expect(results).toHaveLength(4);
  });
});
