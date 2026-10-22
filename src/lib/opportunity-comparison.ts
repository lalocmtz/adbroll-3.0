export interface ComparableOpportunity {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  gmv_30d_calc: number | null;
  creators_active_calc: number | null;
  earning_per_sale: number | null;
}

export const MAX_COMPARISON_PRODUCTS = 2;

export function salesForCommissionGoal(goal: number, earningPerSale: number | null | undefined): number | null {
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(earningPerSale) || !earningPerSale || earningPerSale <= 0) return null;
  const sales = Math.ceil(goal / earningPerSale);
  return Number.isSafeInteger(sales) && sales > 0 ? sales : null;
}

/** Resolve from currently visible, accessible rows so a stale selection cannot reveal gated data. */
export function getComparisonProducts<T extends { id: string }>(
  selectedIds: readonly string[],
  visibleProducts: readonly T[],
  isLoggedIn: boolean,
  previewLimit: number,
): T[] {
  const accessible = isLoggedIn ? visibleProducts : visibleProducts.slice(0, previewLimit);
  const byId = new Map(accessible.map(product => [product.id, product]));
  return [...new Set(selectedIds)]
    .flatMap(id => byId.has(id) ? [byId.get(id)!] : [])
    .slice(0, MAX_COMPARISON_PRODUCTS);
}
