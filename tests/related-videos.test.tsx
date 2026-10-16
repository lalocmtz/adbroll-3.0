import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RelatedVideos from "@/pages/RelatedVideos";

const state = vi.hoisted(() => ({ queries: [] as any[], rpc: vi.fn(), playable: 45, identified: 50, productId: "1736327955572163659" as string | null }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ isFounder: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/VideoCardOriginal", () => ({ default: ({ video }: any) => <div>{video.title}</div> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: state.rpc, from: (table: string) => {
    const query: any = { table, filters: [], orders: [] };
    state.queries.push(query);
    query.select = (_: string, opts: any = {}) => { query.options = opts; return query; };
    for (const op of ["eq", "or", "not", "neq"]) query[op] = (...args: any[]) => { query.filters.push([op, ...args]); return query; };
    query.order = (...args: any[]) => { query.orders.push(args); return query; };
    query.range = (from: number, to: number) => { query.page = [from, to]; return query; };
    query.maybeSingle = async () => ({ data: table === "creators"
      ? { id: "creator-1", usuario_creador: "Kals_Alex", creator_handle: "@Kals_Alex", country: "mx" }
      : { id: "product-1", producto_nombre: "Drenaje", market: "mx", tiktok_product_id: state.productId }, error: null });
    query.then = (resolve: any) => resolve({ data: query.options.head || !state.playable ? [] : [{ id: "v1", title: "Video disponible" }], count: query.options.head ? state.identified : state.playable, error: null });
    return query;
  } },
}));
const mount = (url = "/creadores/creator-1/videos") => render(<MemoryRouter initialEntries={[url]}><Routes>
  <Route path="/creadores/:creatorId/videos" element={<RelatedVideos />} />
  <Route path="/products/:productId/videos" element={<RelatedVideos />} />
</Routes></MemoryRouter>);

beforeEach(() => {
  state.rpc.mockReset();
  state.rpc.mockImplementation(async () => ({ data: { rows: state.playable ? [{ id: 'v1', title: 'Video disponible' }] : [], count: Math.min(50, state.playable), total_available: state.playable, identified_count: state.identified }, error: null }));
  state.queries = []; state.playable = 45; state.identified = 50; state.productId = "1736327955572163659";
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("related videos", () => {
  it("uses exact creator RPC, caps selection at50 and resets sorting to page one", async () => {
    state.playable = 80;
    mount();
    expect(await screen.findByText("Top 50 de 80 videos disponibles")).toBeInTheDocument();
    expect(state.rpc).toHaveBeenCalledWith('get_creator_catalog_videos', { p_creator_id: 'creator-1', p_sort: 'revenue', p_offset: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Página 2", exact: true }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith('get_creator_catalog_videos', expect.objectContaining({ p_offset: 20 })));
    await screen.findByText("Top 50 de 80 videos disponibles");
    fireEvent.click(screen.getByRole("button", { name: "Vistas" }));
    await waitFor(() => expect(state.rpc).toHaveBeenCalledWith('get_creator_catalog_videos', { p_creator_id: 'creator-1', p_sort: 'views', p_offset: 0 }));
    expect(state.queries.filter(q => q.table === 'videos')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Página 4', exact: true })).not.toBeInTheDocument();
  });

  it("shows an honest empty state for a stale creator link without downloaded files", async () => {
    state.playable = 0; state.identified = 12;
    mount();
    expect(await screen.findByText('0 videos disponibles')).toBeInTheDocument();
    expect(screen.getByText(/Estamos preparando los videos de esta referencia/)).toBeInTheDocument();
  });

  it("explains missing files while enforcing exact product/manual links", async () => {
    state.playable = 0; state.identified = 16;
    mount("/products/product-1/videos");
    expect(await screen.findByText(/Estamos preparando los videos de esta referencia/)).toBeInTheDocument();
    for (const q of state.queries.filter(q => q.table === "videos")) {
      expect(q.filters).toContainEqual(["eq", "product_id", "product-1"]);
      expect(q.filters).toContainEqual(["eq", "country", "mx"]);
      expect(q.filters).toContainEqual(["or", "manual_match.eq.true,tiktok_product_id.eq.1736327955572163659"]);
    }
    expect(screen.queryByText(/últimos 30 días/)).not.toBeInTheDocument();
  });

  it("only accepts manual product links if the product has no valid TikTok ID", async () => {
    state.productId = null;
    mount("/products/product-1/videos");
    await screen.findByText("45 videos disponibles");
    expect(state.queries.find(q => q.page).filters).toContainEqual(["or", "manual_match.eq.true"]);
  });
});
