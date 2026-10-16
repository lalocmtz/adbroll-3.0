import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Creators from "@/pages/Creators";
import { CatalogProductImage } from "@/components/CatalogProductImage";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), loggedIn: true }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ isLoggedIn: mocks.loggedIn }) }));
vi.mock("@/contexts/MarketContext", () => ({ useMarket: () => ({ market: "mx", marketLabel: "México" }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "es", t: (key: string) => key, formatMoney: (n: number) => `$${n}` }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/checkout", () => ({ useStartCheckout: () => ({ start: vi.fn(), loading: false }) }));
vi.mock("@/components/VideoCardOriginal", () => ({ default: ({ video }: any) => <div>{video.title}</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: mocks.rpc,
  auth: { getUser: async () => ({ data: { user: null } }) },
  from: (table: string) => {
    const query: any = {};
    for (const name of ["select", "eq", "neq", "not", "order", "limit"]) query[name] = () => query;
    query.then = (resolve: any) => resolve({ data: table === "creators" ? [{ id: "exact-creator-uuid", usuario_creador: "creador_real", creator_handle: "creador_real", nombre_completo: "Creador real", total_ingresos_mxn: null, seguidores: 0 }] : [{ id: "exact-product-uuid", rank: 1, producto_nombre: "Producto exacto", categoria: "Belleza", commission: null, price: 100, total_ingresos_mxn: 1000, total_ventas: 10, creators_count: 3 }], error: null });
    return query;
  },
} }));
const Location = () => <p>{useLocation().pathname}</p>;
beforeEach(() => {
  vi.clearAllMocks(); mocks.loggedIn = true;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  mocks.rpc.mockImplementation(async (name: string) => name === "get_catalog_report_periods"
    ? { data: [{ snapshot_date_range: "2026-09-10~2026-10-09" }, { snapshot_date_range: "2026-10-03~2026-10-09" }], error: null }
    : { data: { rows: [{ id: "v1", title: "Referencia real" }], count: 41 }, error: null });
});

describe("compact catalogue navigation", () => {
  it("keeps report context available on request and sends the selected period/sort to the server", async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Videos que están vendiendo" });
    expect(screen.queryByText(/Ventas reportadas del periodo seleccionado/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Información de los datos" }));
    expect(await screen.findByText(/Ventas reportadas del periodo seleccionado/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Página 2", exact: true }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_catalog_videos", expect.objectContaining({ p_offset: 20 })));
    await screen.findByRole("button", { name: "Últimos 7 días" });
    fireEvent.click(screen.getByRole("button", { name: "Últimos 7 días" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_catalog_videos", expect.objectContaining({ p_report: "2026-10-03~2026-10-09", p_offset: 0 })));
    await screen.findByRole("button", { name: "Ventas", exact: true });
    fireEvent.click(screen.getByRole("button", { name: "Ventas", exact: true }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("get_catalog_videos", expect.objectContaining({ p_report: "2026-10-03~2026-10-09", p_sort: "revenue", p_offset: 0 })));
  });

  it("continues gating visitor sorting rather than issuing a premium sort", async () => {
    mocks.loggedIn = false;
    render(<MemoryRouter initialEntries={["/app"]}><Routes><Route path="/app" element={<Dashboard />} /><Route path="/unlock" element={<Location />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Ventas", exact: true }));
    expect(await screen.findByText("/unlock")).toBeInTheDocument();
    expect(mocks.rpc.mock.calls.filter(([name]) => name === "get_catalog_videos").every(([, args]) => args.p_sort === "rank")).toBe(true);
  });

  it("opens videos for the exact product and does not fabricate a default commission", async () => {
    render(<MemoryRouter initialEntries={["/products"]}><Routes><Route path="/products" element={<Products />} /><Route path="/videos/product/:id" element={<Location />} /></Routes></MemoryRouter>);
    const button = await screen.findByRole("button", { name: "Ver videos" });
    expect(screen.queryByText("6%")).not.toBeInTheDocument();
    expect(screen.getByText("Sin dato")).toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByText("/videos/product/exact-product-uuid")).toBeInTheDocument();
  });
  it("places the exact-creator video action inside each mobile card and leaves missing metrics empty", async () => {
    render(<MemoryRouter initialEntries={["/creadores"]}><Routes><Route path="/creadores" element={<Creators />} /><Route path="/videos/creator/:id" element={<Location />} /></Routes></MemoryRouter>);
    const card = await screen.findByRole("article", { name: "Creador @creador_real" });
    expect(within(card).getByText("—")).toBeInTheDocument();
    expect(within(card).getByText("0")).toBeInTheDocument();
    expect(within(card).queryByText(/comisión/i)).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Ver videos" }));
    expect(await screen.findByText("/videos/creator/exact-creator-uuid")).toBeInTheDocument();
  });

  it("keeps creator video actions gated for visitors, including preview creators", async () => {
    mocks.loggedIn = false;
    render(<MemoryRouter initialEntries={["/creadores"]}><Routes><Route path="/creadores" element={<Creators />} /><Route path="/unlock" element={<Location />} /></Routes></MemoryRouter>);
    const card = await screen.findByRole("article", { name: "Creador @creador_real" });
    fireEvent.click(within(card).getByRole("button", { name: "Desbloquear videos" }));
    expect(await screen.findByText("/unlock")).toBeInTheDocument();
  });

  it("replaces failed product photos with a labelled fallback and recovers on a new source", () => {
    const view = render(<CatalogProductImage src="https://example.com/broken.jpg" name="Producto exacto" />);
    fireEvent.error(screen.getByRole("img", { name: "Producto exacto" }));
    expect(screen.getByRole("img", { name: "Imagen no disponible: Producto exacto" })).toBeInTheDocument();
    expect(screen.getByText("Sin foto")).toBeInTheDocument();
    view.rerender(<CatalogProductImage src="https://example.com/replacement.jpg" name="Producto exacto" />);
    expect(screen.getByRole("img", { name: "Producto exacto" })).toHaveAttribute("src", "https://example.com/replacement.jpg");
  });

});
