import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLanding from "@/pages/PartnerLanding";
import { authDestination } from "@/lib/auth-destination";
const capacityMock = vi.hoisted(() => ({ capacity: { limit: 100, claimed: 0, remaining: 100, is_open: true } as any, error: null as string | null }));
vi.mock("@/hooks/useCreatorLifetimeCapacity", () => ({ useCreatorLifetimeCapacity: () => ({ ...capacityMock, loading: false, refresh: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.com/presentation.mp4" } }) }) } } }));
vi.mock("@/lib/attribution", () => ({ getStoredRefCode: () => "ALICIA" }));
beforeEach(() => { window.history.replaceState({}, "", "/"); capacityMock.capacity = { limit: 100, claimed: 0, remaining: 100, is_open: true }; capacityMock.error = null; });
describe("creator funnel", () => {
  it("closes the lifetime offer at 100 without closing the commission program", () => {
    capacityMock.capacity = { limit: 100, claimed: 100, remaining: 0, is_open: false };
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Ver requisitos y enviar mis videos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Consultar mi solicitud o acceso/ })).toHaveAttribute('href', '/colaboraciones');
    expect(screen.getByRole('link', { name: /Quiero recomendar/ })).toBeVisible();
  });
  it("shows real remaining places and explains that signup does not reserve one", () => {
    capacityMock.capacity = { limit: 100, claimed: 99, remaining: 1, is_open: true };
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getAllByText('Queda 1 de 100 accesos vitalicios')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Ver requisitos y enviar mis videos/ })).toHaveAttribute('href', '/register?redirect=%2Fcolaboraciones&ref=ALICIA');
    expect(screen.getByText(/Crear tu cuenta, recibir una prueba o enviar los enlaces no reserva/)).toBeVisible();
  });
  it("does not promise an available place if capacity is unknown", () => {
    capacityMock.capacity = null; capacityMock.error = 'No pudimos verificar los accesos disponibles.';
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Ver requisitos y enviar mis videos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Consultar disponibilidad/ })).toBeVisible();
  });
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
  it("shows the same US$15 subscription price for referral customers", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByText(/paga \$15 USD al mes desde el inicio/)).toBeInTheDocument();
    expect(screen.queryByText(/primer mes de \$15/)).not.toBeInTheDocument();
    expect(screen.getByText(/US\$0.75 por cada renovación completa/)).toBeInTheDocument();
  });
  it("calculates actual renewal commissions without promising income", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByText(/no garantiza resultados/)).toBeInTheDocument();
  });
  it("has a useful fallback when the presentation cannot load", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.error(screen.getByLabelText("Presentación del programa TokXray"));
    expect(screen.getByText("No pudimos cargar el video.")).toBeInTheDocument();
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
