import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiscoveryProduct, DiscoveryShop, ProductDiscoveryResult, ProductDiscoverySort, ShopDiscoveryResult } from "@/lib/product-discovery";
import { DISCOVERY_PAGE_SIZE } from "@/lib/product-discovery";

type DiscoveryRpc = "search_catalog_products" | "get_catalog_product" | "get_catalog_shops" | "get_catalog_shop";
type Args = Record<string, string | number | boolean | null>;
// These RPCs ship with the product discovery migration; keep their contract local
// until the generated Supabase schema is refreshed.
const discoveryRpc = supabase.rpc.bind(supabase) as unknown as (name: DiscoveryRpc, args: Args) => Promise<{ data: unknown; error: { message: string } | null }>;

function useDiscoveryRequest<T>(name: DiscoveryRpc, args: Args, enabled = true) {
  const key = JSON.stringify(args);
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: string | null }>({ key: "", data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const refetch = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ key, data: null, loading: true, error: null });
    discoveryRpc(name, JSON.parse(key)).then(({ data, error }) => {
      if (!active) return;
      if (error) throw new Error(error.message);
      if (name.startsWith("search_") || name === "get_catalog_shops") {
        const result = data as { rows?: unknown; count?: unknown };
        if (!Array.isArray(result?.rows) || typeof result?.count !== "number") throw new Error("No se pudo cargar el catálogo.");
      }
      setState({ key, data: data as T, loading: false, error: null });
    }).catch(() => {
      if (active) setState({ key, data: null, loading: false, error: "No pudimos cargar estos datos. Inténtalo de nuevo." });
    });
    return () => { active = false; };
  }, [name, key, enabled, revision]);
  return { data: state.key === key ? state.data : null, loading: enabled && (state.key !== key || state.loading), error: state.key === key ? state.error : null, refetch };
}

export function useProductDiscovery({ market, query = "", sort = "ranking", category = "", hasVideos = false, minCommission = null, shopId = null, page = 1, enabled = true }: {
  market: string; query?: string; sort?: ProductDiscoverySort; category?: string; hasVideos?: boolean; minCommission?: number | null; shopId?: string | null; page?: number; enabled?: boolean;
}) {
  return useDiscoveryRequest<ProductDiscoveryResult>("search_catalog_products", {
    p_market: market, p_query: query.trim() || null, p_sort: sort, p_category: category || null, p_has_videos: hasVideos,
    p_min_commission: minCommission, p_shop_id: shopId, p_offset: (page - 1) * DISCOVERY_PAGE_SIZE, p_limit: DISCOVERY_PAGE_SIZE,
  }, enabled);
}

export function useDiscoveryProduct(market: string, productId?: string) {
  return useDiscoveryRequest<DiscoveryProduct>("get_catalog_product", { p_market: market, p_product_id: productId || null }, !!productId);
}

export async function fetchDiscoveryProduct(market: string, productId: string) {
  const { data, error } = await discoveryRpc("get_catalog_product", { p_market: market, p_product_id: productId });
  if (error) throw error;
  return data as DiscoveryProduct | null;
}

export function useDiscoveryShops(market: string, query: string, page: number) {
  return useDiscoveryRequest<ShopDiscoveryResult>("get_catalog_shops", { p_market: market, p_query: query.trim() || null, p_offset: (page - 1) * DISCOVERY_PAGE_SIZE, p_limit: DISCOVERY_PAGE_SIZE });
}

export function useDiscoveryShop(market: string, shopId?: string) {
  return useDiscoveryRequest<DiscoveryShop>("get_catalog_shop", { p_market: market, p_shop_id: shopId || null }, !!shopId);
}
