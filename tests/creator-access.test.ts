import { describe, expect, it } from 'vitest';
import { hasCreatorAccess, validCreatorVideoUrl } from '@/lib/creator-access';

describe('creator entitlement', () => {
  const now = Date.parse('2026-10-12T00:00:00Z');
  const lifetime = { status: 'active', access_kind: 'lifetime', approved_at: '2026-10-10T00:00:00Z', subscription_ends_at: null };
  it('grants lifetime only after explicit approval and activation', () => {
    expect(hasCreatorAccess(lifetime, now)).toBe(true);
    expect(hasCreatorAccess({ ...lifetime, status: 'pending_review' }, now)).toBe(false);
    expect(hasCreatorAccess({ ...lifetime, status: 'approved' }, now)).toBe(false);
    expect(hasCreatorAccess({ ...lifetime, status: 'rejected' }, now)).toBe(false);
    expect(hasCreatorAccess({ ...lifetime, approved_at: null }, now)).toBe(false);
  });
  it('never interprets legacy null expiry as lifetime; honors existing unexpired grants', () => {
    expect(hasCreatorAccess({ ...lifetime, access_kind: 'limited' }, now)).toBe(false);
    expect(hasCreatorAccess({ ...lifetime, access_kind: 'limited', subscription_ends_at: '2026-10-13T00:00:00Z' }, now)).toBe(true);
    expect(hasCreatorAccess({ ...lifetime, access_kind: 'limited', status: 'approved', subscription_ends_at: '2026-10-13T00:00:00Z' }, now)).toBe(true);
    expect(hasCreatorAccess({ ...lifetime, access_kind: 'limited', subscription_ends_at: '2026-10-11T00:00:00Z' }, now)).toBe(false);
  });
});

describe('creator video links', () => {
  it.each(['https://www.tiktok.com/@user/video/123', 'https://vm.tiktok.com/a/', 'https://vt.tiktok.com/a/', 'https://www.instagram.com/reel/abc/', 'https://www.youtube.com/shorts/abc'])('accepts supported published video %s', url => expect(validCreatorVideoUrl(url)).toBe(true));
  it.each(['https://tiktok.com.evil.test/@user/video/123', 'https://www.tiktok.com/@user', 'javascript:alert(1)', 'http://tiktok.com/@user/video/123'])('rejects non-video or unsafe URL %s', url => expect(validCreatorVideoUrl(url)).toBe(false));
});

describe('invited creator previews', () => {
  it('keeps the existing finite preview during deliverable review or changes, never past expiry', () => {
    const now = Date.parse('2026-10-12T00:00:00Z');
    for (const status of ['pending_review', 'rejected']) {
      const grant = { status, access_kind: 'limited', approved_at: '2026-10-11T00:00:00Z', subscription_ends_at: '2026-10-15T00:00:00Z' };
      expect(hasCreatorAccess(grant, now)).toBe(true);
      expect(hasCreatorAccess(grant, Date.parse('2026-10-16T00:00:00Z'))).toBe(false);
    }
  });
});
