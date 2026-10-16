import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketProvider } from "@/contexts/MarketContext";
import Landing from "@/pages/Landing";

const catalogue = vi.hoisted(() => ({ videos: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { limit: 100, claimed: 24, remaining: 76, is_open: true }, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({data:{user:null}}), signOut: vi.fn() },
    from: (table: string) => {
      const query = { select: () => query, eq: () => query, not: () => query, neq: () => query, order: () => query, limit: async () => ({data:table === "videos" ? catalogue.videos : [],error:null}) };
      return query;
    },
  },
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({language:"es",formatMoney:(n:number)=>`$${n}`}) }));
async function renderLanding() {
  render(<MemoryRouter><MarketProvider><Landing /></MarketProvider></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole("button",{name:"Explorar antes de suscribirme"})).toBeInTheDocument());
}
describe("Mexico launch landing",()=>{
  beforeEach(() => { catalogue.videos = []; });
  it("uses the real capacity for the creator invitation",async()=>{
    await renderLanding();
    expect(await screen.findByRole('link',{name:'Solo 100 creadores: quedan 76 accesos vitalicios por contenido'})).toHaveAttribute('href','/programa-creadores#acceso-vitalicio');
  });
  it("does not fabricate rankings when the data source returns no rows",async()=>{
    await renderLanding();
    expect(await screen.findByText("No hay videos disponibles en este momento.")).toBeInTheDocument();
    expect(screen.queryByText("Serum Vitamina C 30ml")).not.toBeInTheDocument();
    expect(screen.queryByText("@marianacrea")).not.toBeInTheDocument();
  });
  it("shows the 15 USD monthly plan without outdated promotions",async()=>{
    await renderLanding();
    expect(screen.getByText("$15.00 USD")).toBeInTheDocument();
    expect(screen.queryByText(/24\.99|50 % OFF|Antes \$499/)).not.toBeInTheDocument();
  });
  it("explains manual snapshot updates rather than promising live sales",async()=>{
    await renderLanding();
    fireEvent.click(screen.getByRole("button",{name:"¿Cada cuánto se actualiza?"}));
    expect(screen.getByText(/no son ventas en tiempo real/)).toBeInTheDocument();
  });
  it("lets visitors inspect real videos with their reported sales and period", async () => {
    catalogue.videos = [
      {id:"first",video_mp4_url:"https://media.example/first.mp4",creator_handle:"ana",product_name:"Producto A",revenue_mxn:12500,sales:25,snapshot_date_range:"2026-10-01~2026-10-07"},
      {id:"second",video_mp4_url:"https://media.example/second.mp4",creator_handle:"luis",product_name:"Producto B",revenue_mxn:4200,sales:14,snapshot_date_range:"2026-10-01~2026-10-07"},
    ];
    await renderLanding();
    const proof = await screen.findByRole("article", {name:"Caso real del catálogo"});
    expect(within(proof).getByText("$12500")).toBeInTheDocument();
    expect(within(proof).getByText(/MXN · según el reporte/)).toHaveTextContent(/2026/);
    expect(within(proof).getByLabelText("Video de ana")).toHaveAttribute("controls");
    expect(within(proof).getByLabelText("Video de ana")).not.toHaveAttribute("autoplay");
    fireEvent.click(screen.getByRole("button", {name:"Ver ejemplo real 2"}));
    expect(within(proof).getByLabelText("Video de luis")).toHaveAttribute("src", "https://media.example/second.mp4");
    expect(within(proof).getByText("$4200")).toBeInTheDocument();
    expect(within(proof).queryByText("$12500")).not.toBeInTheDocument();
    fireEvent.error(within(proof).getByLabelText("Video de luis"));
    expect(within(proof).getByText("Video no disponible en este momento")).toBeInTheDocument();
  });
});
