import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLanding from "@/pages/PartnerLanding";
import { authDestination } from "@/lib/auth-destination";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.com/presentation.mp4" } }) }) } } }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: () => "ALICIA" }));
describe("creator funnel", () => {
  it("preserves referral and destination for both signup paths", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/register?redirect=%2Faffiliates&ref=ALICIA");
    expect(screen.getByRole("link", { name: /Quiero usar/ })).toHaveAttribute("href", "/register?redirect=%2Fpricing&ref=ALICIA");
  });
  it("calculates actual renewal commissions without promising income", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    expect(screen.getByText("$180")).toBeInTheDocument();
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
    for (const path of ["https://evil.test", "//evil.test", "/admin", null]) expect(authDestination(path)).toBe("/app");
  });
});
