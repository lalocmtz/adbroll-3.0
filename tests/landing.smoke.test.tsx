import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketProvider } from "@/contexts/MarketContext";
import Landing from "@/pages/Landing";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({data:{user:null}}), signOut: vi.fn() },
    from: () => {
      const query = { select: () => query, eq: () => query, not: () => query, neq: () => query, order: () => query, limit: async () => ({data:[],error:null}) };
      return query;
    },
  },
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({language:"es",formatMoney:(n:number)=>`$${n}`}) }));
async function renderLanding() {
  render(<MemoryRouter><MarketProvider><Landing /></MarketProvider></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole("button",{name:"Empezar ahora"})).toBeInTheDocument());
}
describe("Mexico launch landing",()=>{
  it("does not fabricate rankings when the data source returns no rows",async()=>{
    await renderLanding();
    expect(await screen.findByText("No hay videos disponibles en este momento.")).toBeInTheDocument();
    expect(screen.queryByText("Serum Vitamina C 30ml")).not.toBeInTheDocument();
    expect(screen.queryByText("@marianacrea")).not.toBeInTheDocument();
  });
  it("shows the 30 USD monthly plan without outdated promotions",async()=>{
    await renderLanding();
    expect(screen.getByText("$30.00 USD")).toBeInTheDocument();
    expect(screen.queryByText(/24\.99|50 % OFF|Antes \$499/)).not.toBeInTheDocument();
  });
  it("explains manual snapshot updates rather than promising live sales",async()=>{
    await renderLanding();
    fireEvent.click(screen.getByRole("button",{name:"¿Cada cuánto se actualiza?"}));
    expect(screen.getByText(/no son ventas en tiempo real/)).toBeInTheDocument();
  });
  it("switches the script example",async()=>{
    await renderLanding();
    fireEvent.click(screen.getByRole("tab",{name:"Agresivo"}));
    expect(screen.getByText(/5 productos caros no pudieron/)).toBeInTheDocument();
  });
});
