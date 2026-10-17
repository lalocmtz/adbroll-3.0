export type CreatorGrant = {
  status: string;
  access_kind: string;
  approved_at: string | null;
  subscription_ends_at: string | null;
};

export function hasCreatorAccess(grant: CreatorGrant | null, now = Date.now()): boolean {
  if (!grant) return false;
  if (grant.access_kind === "lifetime") {
    return grant.status === "active" && Boolean(grant.approved_at) && grant.subscription_ends_at === null;
  }
  return grant.access_kind === "limited" && ["active", "approved", "pending_review", "rejected"].includes(grant.status)
    && Boolean(grant.subscription_ends_at && Date.parse(grant.subscription_ends_at) > now);
}

export function validCreatorVideoUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^www\./, '');
    return (host === 'tiktok.com' && /^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname))
      || (['vm.tiktok.com', 'vt.tiktok.com'].includes(host) && /^\/[^/]+\/?$/.test(url.pathname))
      || (host === 'instagram.com' && /^\/(reel|p)\/[^/]+\/?$/.test(url.pathname))
      || (host === 'youtube.com' && /^\/shorts\/[^/]+\/?$/.test(url.pathname));
  } catch { return false; }
}
