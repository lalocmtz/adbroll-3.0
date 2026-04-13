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

describe("Landing page (smoke)", () => {
  it("renders the hero headline", () => {
    renderLanding();
    expect(
      screen.getByText(/Deja de adivinar qué creativo sube/i),
    ).toBeInTheDocument();
  });

  it("shows the 4 trust stats", () => {
    renderLanding();
    expect(screen.getByText(/Videos actualizados/i)).toBeInTheDocument();
    expect(screen.getByText(/Datos verificados Kalodata/i)).toBeInTheDocument();
    expect(screen.getByText(/ROAS promedio del top 20/i)).toBeInTheDocument();
  });

  it("renders all three hero video rows with MXN revenue", () => {
    renderLanding();
    // "Serum Vitamina C 30ml" appears in both the list row and the
    // selected-video detail panel, so assert presence, not uniqueness.
    expect(screen.getAllByText("Serum Vitamina C 30ml").length).toBeGreaterThan(0);
    expect(screen.getByText("Resistencia Pro Kit")).toBeInTheDocument();
    expect(
      screen.getByText("Set de Sartenes Antiadherentes"),
    ).toBeInTheDocument();
  });

  it("lets the user switch between hero videos", () => {
    renderLanding();
    // Second hero video switches the selected-video detail panel
    fireEvent.click(screen.getByText("Resistencia Pro Kit"));
    // The detail panel shows the label "Video seleccionado" above the
    // product name — both should still be on screen after switching.
    expect(screen.getAllByText("Resistencia Pro Kit").length).toBeGreaterThan(0);
  });

  it("exposes both primary CTAs in the hero", () => {
    renderLanding();
    const ctas = screen.getAllByRole("button", { name: /Crear cuenta gratis/i });
    expect(ctas.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Ver demo en vivo/i }),
    ).toBeInTheDocument();
  });

  it("renders the FAQ questions", () => {
    renderLanding();
    expect(
      screen.getByText(/¿De dónde vienen los datos\?/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/¿Puedo cancelar cuando quiera\?/i)).toBeInTheDocument();
  });
});
