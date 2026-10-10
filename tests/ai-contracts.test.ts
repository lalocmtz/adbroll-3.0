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
