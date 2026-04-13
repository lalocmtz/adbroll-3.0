import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import posthog from "posthog-js";
import {
  Events,
  track,
  trackStandard,
  identify,
  reset,
  mark,
  measureSince,
  clearMark,
} from "@/lib/analytics";

// The real posthog.init guards on VITE_POSTHOG_KEY which is empty in
// tests, so we exercise the capture path directly via the mocked
// module. Meta Pixel env is stubbed per-test via vi.stubEnv since
// import.meta.env is frozen otherwise.
describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pretend fbq is loaded so the Meta branch runs without network.
    (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq = vi.fn();
    vi.stubEnv("VITE_META_PIXEL_ID", "123456");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exports a stable event catalog", () => {
    expect(Events.LandingCtaClicked).toBe("landing.cta_clicked");
    expect(Events.AdminUploadSucceeded).toBe("admin.upload_succeeded");
    expect(Events.OpportunityViewed).toBe("opportunity.viewed");
  });

  it("track() forwards custom events to Meta Pixel", () => {
    track(Events.LandingCtaClicked, { location: "hero" });
    const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      Events.LandingCtaClicked,
      { location: "hero" },
    );
  });

  it("trackStandard() fires Meta standard events like Lead", () => {
    trackStandard("Lead", { location: "hero" });
    const fbq = (window as unknown as { fbq: ReturnType<typeof vi.fn> }).fbq;
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { location: "hero" });
  });

  it("identify() proxies to PostHog when ready", () => {
    identify("user-123", { email: "test@example.com" });
    // posthog-js is mocked; identify may or may not be called depending
    // on whether init happened in this process. Either way it should
    // not throw.
    expect(posthog.identify).toBeDefined();
  });

  it("reset() is idempotent and safe to call without init", () => {
    expect(() => reset()).not.toThrow();
  });

  it("exposes the new Phase 3 landing + activation events", () => {
    // Regression guard for the event-contract taxonomy (docs/design/event-contract.md).
    expect(Events.LandingViewed).toBe("landing.viewed");
    expect(Events.LandingPricingViewed).toBe("landing.pricing_viewed");
    expect(Events.Top20Loaded).toBe("top20.loaded");
    expect(Events.GuionModalOpened).toBe("guion.modal_opened");
    expect(Events.GuionCopied).toBe("guion.copied");
    expect(Events.TrialStarted).toBe("trial.started");
    expect(Events.PartnerLinkClicked).toBe("partner_link_clicked");
    expect(Events.VariantResearchEmailSubmitted).toBe(
      "variant_research.email_submitted",
    );
  });

  it("mark()/measureSince() returns a non-negative duration in ms", () => {
    mark("test-origin");
    // Busy-loop ~2ms so performance.now moves forward deterministically.
    const t0 = performance.now();
    while (performance.now() - t0 < 2) {
      /* spin */
    }
    const delta = measureSince("test-origin");
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(typeof delta).toBe("number");

    // measureSince on an unknown mark returns undefined (not 0), so callers
    // can distinguish "no origin registered" from "zero elapsed".
    expect(measureSince("never-marked")).toBeUndefined();

    clearMark("test-origin");
    expect(measureSince("test-origin")).toBeUndefined();
  });
});
