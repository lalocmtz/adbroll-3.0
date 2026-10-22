import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Products from "@/pages/Products";
import Shops from "@/pages/Shops";
import ShopDetail from "@/pages/ShopDetail";
import { discoveryPage, productCommercialMetrics, productDisplayName, type DiscoveryProduct } from "@/lib/product-discovery";

const state = vi.hoisted(() => ({ rpc: vi.fn(), loggedIn: true }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ isLoggedIn: state.loggedIn, hasPaid: true, loading: false }) }));
vi.mock("@/contexts/MarketContext", () => ({ useMarket: () => ({ market: "mx", marketLabel: "México" }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "es", formatMoney: (value: number) => `$${value}` }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: state.rpc, auth: { getUser: async () => ({ data: { user: null } }) } } }));
const product: DiscoveryProduct = {
  id: "exact-product", market: "mx", tiktok_product_id: "1736327955572163659", producto_nombre: "Drenaje de prueba", imagen_url: null, producto_url: null,
  categoria: "Belleza", rank: 1, price: 200, precio_mxn: 200, commission: 15, commission_amount: null, revenue_30d: 100000,
  total_ingresos_mxn: 100000, total_ventas: 100, creators_count: 2, identity_status: "catalog", report_date_range: "2026-09-21~2026-10-20",
  available_video_count: 12, analysis_ready_count: 9, is_current_report: true,
};
const shop = { shop_id: "7496276210782146594", shop_name: "Tienda de prueba", rank: 2, revenue: 400000, total_sales: 42, revenue_videos: 300000, revenue_live: null, report_date_range: "2026-09-21~2026-10-20", verified_product_count: 0, available_video_count: 0 };
const result = (rows = [product], count = 1501) => ({ rows, count, categories: ["Belleza"], current_period: "2026-09-21~2026-10-20" });
const Location = () => <p>{useLocation().pathname}</p>;
function mount(path = "/products") {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/products" element={<Products />} /><Route path="/shops" element={<Shops />} />
    <Route path="/shops/:shopId" element={<ShopDetail />} /><Route path="/pricing" element={<Location />} />
    <Route path="/videos/product/:productId" element={<Location />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks(); state.loggedIn = true;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  state.rpc.mockImplementation(async (name: string) => ({ data: name === "get_catalog_shop" ? shop : name === "get_catalog_shops" ? { rows: [shop], count: 1, current_period: shop.report_date_range } : result(), error: null }));
});

describe("product discovery", () => {
  it("hides import ID suffixes in card text and accessibility while retaining the exact identity", async () => {
    const imported = { ...product, producto_nombre: "Drenaje de prueba [ID:1736327955572163659]", producto_url: "https://www.tiktok.com/shop/pdp/1736327955572163659" };
    state.rpc.mockResolvedValue({ data: result([imported], 1), error: null });
    mount();
    const article = await screen.findByRole("article", { name: "Producto Drenaje de prueba" });
    expect(within(article).getByRole("heading", { name: "Drenaje de prueba" })).toHaveAttribute("title", "Drenaje de prueba");
    expect(within(article).getByRole("img", { name: "Imagen no disponible: Drenaje de prueba" })).toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Guardar Drenaje de prueba en favoritos" })).toBeInTheDocument();
    expect(within(article).getByRole("button", { name: "Abrir Drenaje de prueba en TikTok Shop" })).toBeInTheDocument();
    expect(article.innerHTML).not.toContain("[ID:");
    expect(imported.producto_nombre).toBe("Drenaje de prueba [ID:1736327955572163659]");
    fireEvent.click(within(article).getByRole("button", { name: "Ver videos" }));
    expect(await screen.findByText("/videos/product/exact-product")).toBeInTheDocument();
  });
  it("requests pages beyond the first 1000 records and resets offset after a search", async () => {
    mount();
    await screen.findByRole("article", { name: "Producto Drenaje de prueba" });
    fireEvent.click(screen.getByRole("button", { name: "Página 76", exact: true }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith("search_catalog_products", expect.objectContaining({ p_offset: 1500, p_limit: 20 })));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "https://www.tiktok.com/shop/pdp/1736327955572163659" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar", exact: true }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith("search_catalog_products", expect.objectContaining({ p_query: "https://www.tiktok.com/shop/pdp/1736327955572163659", p_offset: 0 })));
    expect(screen.getByText(/1,501 productos para/)).toBeInTheDocument();
  });
  it("combines URL filters server-side and links the exact product UUID", async () => {
    mount("/products?q=drenaje&category=Belleza&commission=15&videos=1&sort=commission");
    const article = await screen.findByRole("article", { name: "Producto Drenaje de prueba" });
    expect(state.rpc).toHaveBeenCalledWith("search_catalog_products", expect.objectContaining({ p_query: "drenaje", p_category: "Belleza", p_min_commission: 15, p_has_videos: true, p_sort: "commission" }));
    expect(within(article).getByText("≈ $30")).toBeInTheDocument();
    expect(within(article).getByText("12 videos")).toBeInTheDocument();
    fireEvent.click(within(article).getByRole("button", { name: "Ver videos" }));
    expect(await screen.findByText("/videos/product/exact-product")).toBeInTheDocument();
  });
  it("shows source-only products without inventing commercial figures", async () => {
    state.rpc.mockResolvedValue({ data: result([{ ...product, identity_status: "video_source", report_date_range: null, is_current_report: false }], 1), error: null });
    mount("/products?q=drenaje");
    const article = await screen.findByRole("article", { name: "Producto Drenaje de prueba" });
    expect(within(article).queryByText("≈ $30")).not.toBeInTheDocument();
    expect(within(article).getAllByText("Sin dato")).toHaveLength(3);
    expect(within(article).getByText("Ficha comercial por completar")).toBeInTheDocument();
    expect(within(article).getByText("12 videos")).toBeInTheDocument();
  });
  it("keeps a visitor's search and direct filtered URL behind the existing offer", async () => {
    state.loggedIn = false;
    mount("/products?q=secreto&commission=15&page=3");
    await screen.findByRole("article");
    expect(state.rpc).toHaveBeenCalledWith("search_catalog_products", expect.objectContaining({ p_query: null, p_min_commission: null, p_offset: 0 }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "drenaje" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar", exact: true }));
    expect(await screen.findByText("/pricing")).toBeInTheDocument();
    expect(state.rpc.mock.calls.every(([, args]) => args.p_query === null)).toBe(true);
  });
  it("shows a retryable error rather than a false zero-result state", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { message: "network" } });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar estos datos");
    expect(screen.queryByText("No encontramos productos con esta búsqueda")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });
  it("does not overwrite newer search results when an older request finishes late", async () => {
    let resolveOld!: (value: unknown) => void;
    state.rpc.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    mount();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "drenaje" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar", exact: true }));
    await screen.findByRole("article", { name: "Producto Drenaje de prueba" });
    await act(async () => { resolveOld({ data: result([{ ...product, producto_nombre: "Resultado antiguo" }]), error: null }); });
    expect(screen.queryByRole("article", { name: "Producto Resultado antiguo" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Producto Drenaje de prueba" })).toBeInTheDocument();
  });
});

describe("shop discovery", () => {
  it("keeps visitor shop actions on the existing subscription offer", async () => {
    state.loggedIn = false;
    mount("/shops");
    fireEvent.click(await screen.findByRole("button", { name: "Ver tienda" }));
    expect(await screen.findByText("/pricing")).toBeInTheDocument();
    expect(state.rpc.mock.calls.every(([name]) => name !== "get_catalog_shop")).toBe(true);
  });
  it("shows actual shop metrics and keeps their identity distinct from a brand", async () => {
    mount("/shops");
    const article = await screen.findByRole("article", { name: "Tienda Tienda de prueba" });
    expect(within(article).getByText("$400000")).toBeInTheDocument();
    expect(within(article).getByText("0 productos vinculados")).toBeInTheDocument();
    fireEvent.click(within(article).getByRole("button", { name: "Ver tienda" }));
    expect(await screen.findByRole("heading", { name: "Productos de esta tienda" })).toBeInTheDocument();
  });
  it("does not fill an unlinked shop with unrelated products", async () => {
    state.rpc.mockImplementation(async name => ({ data: name === "get_catalog_shop" ? shop : result([], 0), error: null }));
    mount(`/shops/${shop.shop_id}`);
    expect(await screen.findByText("Sus productos todavía no están vinculados")).toBeInTheDocument();
    expect(state.rpc).toHaveBeenCalledWith("search_catalog_products", expect.objectContaining({ p_shop_id: shop.shop_id, p_sort: "revenue_30d" }));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(/Una tienda puede ofrecer productos de distintas marcas/)).toBeInTheDocument();
    expect(screen.getByText("Sin dato")).toBeInTheDocument();
  });
});

describe("product commercial calculations", () => {
  it("preserves reported zero values and does not substitute legacy prices", () => {
    expect(productCommercialMetrics({ ...product, price: 0, precio_mxn: 100, commission: 0, revenue_30d: 0, total_ingresos_mxn: 1000 }).earnings).toBe(0);
    expect(productCommercialMetrics({ ...product, revenue_30d: 0 }).revenue).toBe(0);
    expect(productCommercialMetrics({ ...product, commission: null }).earnings).toBeNull();
  });
  it("ignores contaminated commercial metrics on video-only identities", () => {
    expect(Object.values(productCommercialMetrics({ ...product, identity_status: "video_source" })).every(value => value === null)).toBe(true);
  });
  it.each(["-1", "Infinity", "1.5", "0", "garbage", "9007199254740991"])("normalizes invalid pagination %s", value => expect(discoveryPage(value)).toBe(1));
});

describe("product display names", () => {
  it.each([
    ["Drenaje [ID:1736327955572163659]", "Drenaje"],
    ["Drenaje[ID:1736327955572163659]", "Drenaje"],
    ["Drenaje", "Drenaje"],
    ["Kit [ID:123] de regalo", "Kit [ID:123] de regalo"],
    ["Kit [ID:123abc]", "Kit [ID:123abc]"],
    ["Kit [id:123]", "Kit [id:123]"],
    ["Kit [ID: 123]", "Kit [ID: 123]"],
    ["Kit [ID:123] extra", "Kit [ID:123] extra"],
  ])("only removes an exact trailing import marker from %s", (stored, displayed) => {
    expect(productDisplayName(stored)).toBe(displayed);
  });
});
