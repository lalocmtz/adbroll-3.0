import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerLanding from "@/pages/PartnerLanding";
import type { CreatorLifetimeCapacityData } from "@/hooks/useCreatorLifetimeCapacity";
import { authDestination } from "@/lib/auth-destination";
const capacityMock = vi.hoisted(() => ({ capacity: { limit: 100, claimed: 0, remaining: 100, is_open: true } as CreatorLifetimeCapacityData | null, error: null as string | null }));
vi.mock("@/hooks/useCreatorLifetimeCapacity", () => ({ useCreatorLifetimeCapacity: () => ({ ...capacityMock, loading: false, refresh: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "https://example.com/presentation.mp4" } }) }) } } }));
vi.mock("@/lib/analytics", () => ({ Events: { LandingCtaClicked: "landing.cta_clicked" }, track: vi.fn() }));
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
    expect(screen.getByText('Queda 1 de 100 accesos vitalicios')).toBeVisible();
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
    render(<MemoryRouter initialEntries={["/programa-creadores?leader=gus"]}><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/register?redirect=%2Faffiliates%3Fleader%3DGUS");
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
    expect(screen.getByText("US$45.00")).toBeInTheDocument();
    expect(screen.getByText(/no garantiza resultados/)).toBeInTheDocument();
  });
  it("loads the bundled demo when the uploaded presentation is missing", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.error(screen.getByLabelText("Presentación del programa TokXray"));
    const demo = screen.getByLabelText("Demostración de la aplicación TokXray");
    expect(demo).toHaveAttribute("src", expect.stringContaining("tokxray-demo-1080p.mp4"));
    expect(demo).toHaveAttribute("controls");
    expect(demo).not.toHaveAttribute("autoplay");
    expect(screen.queryByText("No pudimos cargar el video.")).not.toBeInTheDocument();
    expect(screen.getByText("DALE PLAY / MIRA LA APLICACIÓN")).toBeVisible();
  });
  it("uses the lighter demo on mobile and handles a second media failure", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    matchMedia.mockRestore();
    fireEvent.error(screen.getByLabelText("Presentación del programa TokXray"));
    const demo = screen.getByLabelText("Demostración de la aplicación TokXray");
    expect(demo).toHaveAttribute("src", expect.stringContaining("tokxray-demo-720p.mp4"));
    fireEvent.error(demo);
    expect(screen.getByText("No pudimos cargar el video.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver cómo funciona" })).toHaveAttribute("href", "#como-funciona");
  });
  it("calculates leader renewals separately from each creator's commission", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Mi comunidad" }));
    fireEvent.change(screen.getByLabelText(/Creadores vinculados/), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/Clientes que renuevan por creador/), { target: { value: "20" } });
    expect(screen.getByRole("status")).toHaveTextContent("US$150.00");
    expect(screen.getByText(/US\$45.00 para cada creador/)).toBeVisible();
    expect(screen.getByText(/no cobras por su primer pago indirecto/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mis clientes" }));
    expect(screen.getByRole("status")).toHaveTextContent("US$45.00");
    expect(screen.getByText(/US\$100.00 por sus primeros pagos/)).toHaveTextContent("no se suma a las renovaciones");
  });
  it("uses the campaign referral and never treats an invalid leader as a community", () => {
    render(<MemoryRouter initialEntries={["/gana?ref=BOB&leader=x"]}><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/register?redirect=%2Faffiliates&ref=BOB");
    expect(screen.queryByText(/Te invita la comunidad/)).not.toBeInTheDocument();
  });
  it("explains both routes and offers distinct signup, panel and content destinations", () => {
    render(<MemoryRouter><PartnerLanding /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gana dinero con TokXray.");
    expect(screen.getByRole("heading", { name: "Invita a tus seguidores." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Invita a otros creadores." })).toBeVisible();
    expect(screen.getByRole("link", { name: /Ir a mi panel de referidos/ })).toHaveAttribute("href", "/login?redirect=%2Faffiliates");
    const guide = document.getElementById("tu-panel")!;
    expect(within(guide).getByRole("heading", { name: "Copiar enlace de comunidad" })).toBeVisible();
    expect(within(guide).getByRole("heading", { name: "Aceptar invitación de comunidad" })).toBeVisible();
    expect(within(guide).getByText(/Revisión semanal no significa depósito automático/)).toBeVisible();
  });
  it("takes an existing account directly to the panel and preserves a leader invitation", () => {
    render(<MemoryRouter initialEntries={["/gana?leader=GUS"]}><PartnerLanding hasSession /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Quiero recomendar/ })).toHaveAttribute("href", "/affiliates?leader=GUS");
    expect(screen.getByRole("link", { name: "Mi panel" })).toHaveAttribute("href", "/affiliates?leader=GUS");
    expect(screen.getByRole("link", { name: /Ver requisitos y enviar mis videos/ })).toHaveAttribute("href", "/colaboraciones");
  });
  it("allows only known local post-auth destinations", () => {
    expect(authDestination("/affiliates")).toBe("/affiliates");
    expect(authDestination("/pricing")).toBe("/pricing");
    expect(authDestination("/affiliates?leader=gus")).toBe("/affiliates?leader=GUS");
    expect(authDestination(`/affiliates?leader=${"A".repeat(32)}`)).toBe(`/affiliates?leader=${"A".repeat(32)}`);
    expect(authDestination("/colaboraciones")).toBe("/colaboraciones");
    expect(authDestination("/canjear?code=creator-abc123")).toBe("/canjear?code=CREATOR-ABC123");
    for (const path of ["https://evil.test", "//evil.test", "/admin", "/affiliates?leader=GU", `/affiliates?leader=${"A".repeat(33)}`, "/affiliates?leader=LUIS&redirect=https://evil.test", "/affiliates?leader=LUIS%26x", "/canjear?code=CREATOR-ABC&redirect=evil", null]) expect(authDestination(path)).toBe("/app");
  });
});
