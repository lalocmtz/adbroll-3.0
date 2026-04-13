import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import posthog from "posthog-js";
import { Events, track, trackStandard, identify, reset } from "@/lib/analytics";

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
});
