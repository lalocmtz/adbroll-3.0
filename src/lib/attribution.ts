// Attribution helpers: UTM parsing, ref_code persistence, first-touch capture.
//
// Safari Intelligent Tracking Prevention wipes localStorage after 7 days
// of inactivity, so any ref_code captured during a paid acquisition run
// also lives in a 90-day first-party cookie. Cookie > localStorage for
// read priority because cookies survive the ITP window.

export interface AttributionPayload {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  ref_code: string | null;
  referrer: string | null;
  landing_path: string;
}

const REF_COOKIE = "adbroll_ref";
const REF_LS_KEY = "adbroll_ref_code";
const REF_COOKIE_DAYS = 90;
const PARTNER_FIRED_KEY = "adbroll_partner_fired"; // session dedupe

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  // SameSite=Lax so it survives TikTok → adbroll navigations, Secure only
  // in prod to keep localhost dev working without HTTPS.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; expires=${expires}; path=/; SameSite=Lax${secure}`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
};

/**
 * Read the current ref_code from cookie first, then localStorage fallback.
 * Components that render conditionally based on ref should use this.
 */
export const getStoredRefCode = (): string | null => {
  const cookieRef = getCookie(REF_COOKIE);
  if (cookieRef) return cookieRef;
  try {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(REF_LS_KEY)
      : null;
  } catch {
    return null;
  }
};

/**
 * Persist a ref_code to both cookie (90d, survives ITP) and localStorage
 * (existing app contract). Called from capture on first visit.
 */
export const persistRefCode = (code: string) => {
  if (!code) return;
  setCookie(REF_COOKIE, code, REF_COOKIE_DAYS);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(REF_LS_KEY, code);
    }
  } catch {
    /* private browsing / quota errors are fine */
  }
};

/**
 * Parse attribution params from the current URL. Does not persist or
 * fire analytics — the caller decides. Pure function for easy testing.
 */
export const parseAttribution = (
  search: string,
  pathname: string,
  referrer: string | null,
): AttributionPayload => {
  const params = new URLSearchParams(search);
  const utm = Object.fromEntries(
    UTM_KEYS.map((key) => [key, params.get(key)]),
  ) as Record<(typeof UTM_KEYS)[number], string | null>;

  const ref_code = params.get("ref") ?? null;
  return {
    ...utm,
    ref_code,
    referrer,
    landing_path: pathname,
  };
};

/**
 * Capture attribution from the current document. Writes the ref_code to
 * cookie+localStorage, returns the parsed payload for the caller to fire
 * landing.viewed / partner_link_clicked events.
 *
 * Calling this twice in the same SPA session is a no-op for the partner
 * event (sessionStorage dedupe) so React StrictMode double-mount in dev
 * doesn't double-fire.
 */
export const captureAttribution = (): {
  payload: AttributionPayload;
  isNewPartnerSession: boolean;
} => {
  const safeReferrer =
    typeof document !== "undefined" && document.referrer
      ? document.referrer
      : null;
  const payload = parseAttribution(
    typeof window !== "undefined" ? window.location.search : "",
    typeof window !== "undefined" ? window.location.pathname : "/",
    safeReferrer,
  );

  if (payload.ref_code) {
    persistRefCode(payload.ref_code);
  }

  let isNewPartnerSession = false;
  if (payload.ref_code && typeof sessionStorage !== "undefined") {
    try {
      const alreadyFired = sessionStorage.getItem(PARTNER_FIRED_KEY);
      if (!alreadyFired) {
        sessionStorage.setItem(PARTNER_FIRED_KEY, payload.ref_code);
        isNewPartnerSession = true;
      }
    } catch {
      /* private mode — assume new session so the event still fires once */
      isNewPartnerSession = true;
    }
  }

  return { payload, isNewPartnerSession };
};
