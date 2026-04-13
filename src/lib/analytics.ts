// Thin analytics layer for Adbroll.
//
// Wraps PostHog (product analytics), Meta Pixel (paid traffic conversions)
// and Sentry breadcrumbs into a single surface. Everything is a no-op
// when the corresponding env var is missing, so local dev never needs a
// full stack to function.
//
// Use the event constants below instead of free-form strings so future
// analysis / dashboards stay consistent.

import posthog from "posthog-js";
import * as Sentry from "@sentry/react";

type PrimitiveProps = Record<
  string,
  string | number | boolean | null | undefined
>;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let posthogReady = false;

export const initPostHog = () => {
  if (posthogReady || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // we fire our own via React Router
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: import.meta.env.DEV,
  });
  posthogReady = true;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _adbrollMetaReady?: boolean;
  }
}

const metaTrack = (
  event: string,
  params?: PrimitiveProps,
  type: "track" | "trackCustom" = "track",
) => {
  if (typeof window === "undefined") return;
  // Read env inline so runtime stubs (and tests) pick up changes.
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!pixelId || !window.fbq) return;
  try {
    window.fbq(type, event, params ?? {});
  } catch {
    /* swallow — analytics never breaks the app */
  }
};

/**
 * Track a typed product event.
 *
 * Fires to PostHog, forwards as a custom event to Meta Pixel (for ad
 * optimization against user behavior, not just standard conversions),
 * and leaves a Sentry breadcrumb for error triage.
 */
export const track = (event: string, props?: PrimitiveProps) => {
  if (posthogReady) {
    posthog.capture(event, props);
  }
  metaTrack(event, props, "trackCustom");
  Sentry.addBreadcrumb({
    category: "analytics",
    level: "info",
    message: event,
    data: props,
  });
};

/**
 * Meta Pixel standard events (Lead, CompleteRegistration, Purchase, etc.)
 * These map to the ads manager optimization goals, so we emit them
 * explicitly — they're not automatic from `track()`.
 */
export const trackStandard = (
  event:
    | "Lead"
    | "CompleteRegistration"
    | "ViewContent"
    | "InitiateCheckout"
    | "Subscribe"
    | "StartTrial"
    | "Customize"
    | "Purchase",
  params?: PrimitiveProps,
) => {
  metaTrack(event, params, "track");
  track(`meta.${event.toLowerCase()}`, params);
};

/* =============================================================
   Compatibility wrappers — legacy Lovable call sites import named
   track* helpers. Keep these as thin shims over trackStandard +
   custom track() so existing pages (Unlock, PaywallModal,
   CheckoutSuccess, Register, VideoAnalysisModal, SimpleEmailCapture)
   keep building without a refactor pass.
   ============================================================= */
export const trackLead = (source?: string, email?: string) => {
  trackStandard("Lead", { source, email });
  track("lead.captured", { source, email });
};

export const trackSignUp = (method?: string, email?: string) => {
  trackStandard("CompleteRegistration", { method, email });
  track("auth.signup", { method, email });
};

export const trackViewContent = (contentType?: string, contentId?: string) => {
  trackStandard("ViewContent", { content_type: contentType, content_id: contentId });
};

export const trackInitiateCheckout = (
  value?: number,
  currency?: string,
  plan?: string,
) => {
  trackStandard("InitiateCheckout", { value, currency, plan });
};

export const trackPurchase = (
  value?: number,
  currency?: string,
  transactionId?: string,
  email?: string,
  plan?: string,
) => {
  trackStandard("Purchase", {
    value,
    currency,
    transaction_id: transactionId,
    email,
    plan,
  });
};

export const trackScriptAnalysis = (videoId?: string) => {
  track("guion.analysis_requested", { video_id: videoId });
};

/* =============================================================
   Timing helper — captures performance marks on the client so we
   can compute time_to_*_ms props (e.g. guion.copied.time_to_copy_ms
   from guion.modal_opened, or auth.login_succeeded → guion.copied
   for the P50 activation metric in the brief §10).
   ============================================================= */
const marks = new Map<string, number>();
export const mark = (key: string) => {
  if (typeof performance === "undefined") return;
  marks.set(key, performance.now());
};
export const measureSince = (key: string): number | undefined => {
  if (typeof performance === "undefined") return undefined;
  const t = marks.get(key);
  return t !== undefined ? Math.round(performance.now() - t) : undefined;
};
export const clearMark = (key: string) => marks.delete(key);

export const trackPageView = (path: string) => {
  if (posthogReady) {
    posthog.capture("$pageview", { $current_url: path });
  }
  metaTrack("PageView");
};

export const identify = (
  userId: string,
  traits?: PrimitiveProps,
) => {
  if (posthogReady) {
    posthog.identify(userId, traits);
  }
  Sentry.setUser({ id: userId, ...traits });
};

export const reset = () => {
  if (posthogReady) {
    posthog.reset();
  }
  Sentry.setUser(null);
};

/* =============================================================
   Event catalog — single source of truth for event names.
   Add new events here so Phase 4b Opportunities and future
   features keep naming consistent.
   ============================================================= */
export const Events = {
  // Landing funnel
  LandingViewed: "landing.viewed",
  LandingCtaClicked: "landing.cta_clicked",
  LandingVideoSelected: "landing.hero_video_selected",
  LandingCalculatorUsed: "landing.calculator_used",
  LandingFaqOpened: "landing.faq_opened",
  LandingPricingViewed: "landing.pricing_viewed",
  LandingFooterViewed: "landing.footer_viewed",

  // Auth
  AuthRegisterSubmitted: "auth.register_submitted",
  AuthRegisterSucceeded: "auth.register_succeeded",
  AuthLoginSubmitted: "auth.login_submitted",
  AuthLoginSucceeded: "auth.login_succeeded",
  AuthLogout: "auth.logout",

  // Trial / subscription (server → client re-hydrate or webhook)
  TrialStarted: "trial.started",
  SubscriptionActivated: "subscription.activated",

  // Dashboard
  DashboardViewed: "dashboard.viewed",
  VideoCardOpened: "dashboard.video_opened",
  ScriptModalOpened: "dashboard.script_opened",

  // Top 20 + guion (activation loop)
  Top20Loaded: "top20.loaded",
  Top20RowClicked: "top20.row_clicked",
  GuionModalOpened: "guion.modal_opened",
  GuionVariantSelected: "guion.variant_selected",
  GuionCopied: "guion.copied",

  // Variant generator research survey (P7)
  VariantResearchViewed: "variant_research.viewed",
  VariantResearchEmailSubmitted: "variant_research.email_submitted",
  VariantResearchDismissed: "variant_research.dismissed",

  // Admin / ingestion
  AdminUploadStarted: "admin.upload_started",
  AdminUploadSucceeded: "admin.upload_succeeded",
  AdminUploadFailed: "admin.upload_failed",

  // Opportunities (Phase 4b — already reserved)
  OpportunityViewed: "opportunity.viewed",
  OpportunityExpanded: "opportunity.expanded",
  OpportunityFormatViewed: "opportunity.format_viewed",
  OpportunityToolClicked: "opportunity.tool_clicked",

  // Creator Partner Program (Fase 7 — only partner_link_clicked is live in Phase 3)
  PartnerLinkClicked: "partner_link_clicked",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
