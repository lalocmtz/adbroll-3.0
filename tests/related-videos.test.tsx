import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RelatedVideos, { creatorVideoFilter } from "@/pages/RelatedVideos";

const state = vi.hoisted(() => ({ queries: [] as any[], playable: 45, identified: 50, productId: "1736327955572163659" as string | null }));
vi.mock("@/contexts/BlurGateContext", () => ({ useBlurGateContext: () => ({ isFounder: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/VideoCardOriginal", () => ({ default: ({ video }: any) => <div>{video.title}</div> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => {
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
  state.queries = []; state.playable = 45; state.identified = 50; state.productId = "1736327955572163659";
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("related videos", () => {
  it("matches exact normalized handles without treating underscores as wildcards", () => {
    expect(creatorVideoFilter({ id: "creator-1", creator_handle: " @Kals_Alex ", usuario_creador: "" }))
      .toBe("creator_id.eq.creator-1,creator_handle.ilike.kals\\_alex,creator_handle.ilike.@kals\\_alex");
    expect(creatorVideoFilter({ id: "creator-1", creator_handle: "bad,filter%", usuario_creador: "" }))
      .toBe("creator_id.eq.creator-1");
  });

  it("uses the full server count and requests the next page, then resets sorting to page one", async () => {
    mount();
    expect(await screen.findByText("45 videos disponibles")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2", exact: true }));
    await waitFor(() => expect(state.queries.some(q => q.page?.[0] === 20 && q.page?.[1] === 39)).toBe(true));
    await screen.findByText("45 videos disponibles");
    fireEvent.click(screen.getByRole("button", { name: "Más vistas" }));
    await waitFor(() => expect(state.queries.some(q => q.page?.[0] === 0 && q.orders[0]?.[0] === "views")).toBe(true));
    const page = state.queries.find(q => q.page);
    expect(page.filters).toContainEqual(["not", "video_mp4_url", "is", null]);
    expect(page.filters).toContainEqual(["neq", "video_mp4_url", ""]);
  });

  it("explains missing files while enforcing exact product/manual links", async () => {
    state.playable = 0; state.identified = 16;
    mount("/products/product-1/videos");
    expect(await screen.findByText(/Hay 16 videos identificados/)).toBeInTheDocument();
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
