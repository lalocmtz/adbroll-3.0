import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "@/pages/Landing";

// Supabase client is imported transitively via GlobalHeader; stub it
// so the test never hits the network.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Language context needs router context to render — wrap everything in
// MemoryRouter below and skip the provider for this smoke test.
vi.mock("@/contexts/LanguageContext", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLanguage: () => ({ t: (k: string) => k, lang: "es", setLang: () => {} }),
}));

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );

describe("Landing page (smoke) — Variante E", () => {
  it("renders the narrative hero headline", () => {
    renderLanding();
    // Headline is split across inline spans; match the distinctive phrase.
    expect(
      screen.getByText(/Ana se despertó a las 6 am/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Susana ya había ganado/i)).toBeInTheDocument();
  });

  it("shows the urgency chip and live GMV counter", () => {
    renderLanding();
    expect(
      screen.getByText(/50% OFF para los primeros 100/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Vendido hoy en TikTok Shop México/i),
    ).toBeInTheDocument();
  });

  it("renders the Top 20 dashboard mock with at least 3 real rows", () => {
    renderLanding();
    expect(screen.getByText("Serum Vitamina C 30ml")).toBeInTheDocument();
    expect(screen.getByText("Resistencia Pro Kit")).toBeInTheDocument();
    expect(
      screen.getByText("Sartenes Antiadherentes x5"),
    ).toBeInTheDocument();
  });

  it("exposes the primary hero CTAs", () => {
    renderLanding();
    // Hero: "Ver el Top 20 de hoy" and "Ya tengo cuenta"
    expect(
      screen.getByRole("button", { name: /Ver el Top 20 de hoy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ya tengo cuenta/i }),
    ).toBeInTheDocument();
    // Top20 unlock CTA
    expect(
      screen.getByRole("button", { name: /Desbloquear los 20 videos/i }),
    ).toBeInTheDocument();
  });

  it("renders the guion demo with three tab variants", () => {
    renderLanding();
    expect(screen.getByRole("tab", { name: /Transcrito/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Optimizado IA/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Agresivo/i })).toBeInTheDocument();
  });

  it("switches guion variants when a tab is clicked", () => {
    renderLanding();
    // Agresivo tab surfaces a distinctive phrase not present in ia_optimizado.
    fireEvent.click(screen.getByRole("tab", { name: /Agresivo/i }));
    expect(
      screen.getByText(/5 productos caros no pudieron/i),
    ).toBeInTheDocument();
  });

  it("renders the pricing card with promo price and gated fine print", () => {
    renderLanding();
    expect(
      screen.getByRole("button", { name: /Empezar por \$249 MXN/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Antes \$499 MXN · \$25 USD/i)).toBeInTheDocument();
  });

  it("renders the FAQ questions", () => {
    renderLanding();
    expect(
      screen.getByText(/¿De dónde vienen los datos\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/¿Puedo cancelar cuando quiera\?/i),
    ).toBeInTheDocument();
  });
});
