import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLanding from "@/pages/PartnerLanding";
import { authDestination } from "@/lib/auth-destination";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.com/presentation.mp4" } }) }) } } }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: () => "ALICIA" }));
beforeEach(() => window.history.replaceState({}, "", "/"));
describe("creator funnel", () => {
  it("preserves referral and destination for both signup paths", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/register?redirect=%2Faffiliates&ref=ALICIA");
    expect(screen.getByRole("link", { name: /Quiero usar/ })).toHaveAttribute("href", "/register?redirect=%2Fpricing&ref=ALICIA");
  });
  it("preserves a community invite across signup without converting it into purchase attribution", () => {
    window.history.replaceState({}, "", "/programa-creadores?leader=LUIS");
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/register?redirect=%2Faffiliates%3Fleader%3DLUIS");
    expect(screen.getByText(/no te vincula automáticamente/)).toBeVisible();
  });
  it("shows the same US$29 subscription price for referral customers", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByText(/paga \$29 USD al mes desde el inicio/)).toBeInTheDocument();
    expect(screen.queryByText(/primer mes de \$15/)).not.toBeInTheDocument();
    expect(screen.getByText(/US\$1.45 por cada renovación completa/)).toBeInTheDocument();
  });
  it("calculates actual renewal commissions without promising income", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    expect(screen.getByText("$87.00")).toBeInTheDocument();
    expect(screen.getByText(/no garantiza resultados/)).toBeInTheDocument();
  });
  it("has a useful fallback before the founder uploads the video", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.error(screen.getByLabelText("Presentación del programa TokXray"));
    expect(screen.getByText("La presentación está en camino.")).toBeInTheDocument();
  });
  it("allows only known local post-auth destinations", () => {
    expect(authDestination("/affiliates")).toBe("/affiliates");
    expect(authDestination("/pricing")).toBe("/pricing");
    expect(authDestination("/affiliates?leader=Luis")).toBe("/affiliates?leader=LUIS");
    expect(authDestination("/colaboraciones")).toBe("/colaboraciones");
    expect(authDestination("/canjear?code=creator-abc123")).toBe("/canjear?code=CREATOR-ABC123");
    for (const path of ["https://evil.test", "//evil.test", "/admin", "/affiliates?leader=LUIS&redirect=https://evil.test", "/affiliates?leader=LUIS%26x", "/canjear?code=CREATOR-ABC&redirect=evil", null]) expect(authDestination(path)).toBe("/app");
  });
});
