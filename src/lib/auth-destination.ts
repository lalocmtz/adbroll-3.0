import { isReferralCode, normalizeReferralCode } from "./referral-code";
const destinations = new Set(["/app", "/affiliates", "/pricing", "/settings", "/canjear", "/colaboraciones"]);
export function authDestination(value: string | null): string {
  if (value && destinations.has(value)) return value;
  // Preserve only the community invitation parameter, never arbitrary redirects.
  if (value && /^\/affiliates\?leader=[a-zA-Z0-9]+$/.test(value) && isReferralCode(value.split("=")[1])) {
    return `/affiliates?leader=${normalizeReferralCode(value.split("=")[1])}`;
  }
  if (value && /^\/canjear\?code=CREATOR-[A-Z0-9]+$/i.test(value)) {
    return `/canjear?code=${value.split("=")[1].toUpperCase()}`;
  }
  return "/app";
}
export function authCallbackUrl(destination: string): string {
  return `${window.location.origin}/auth/continue?redirect=${encodeURIComponent(authDestination(destination))}`;
}
