export interface DiscoveryProduct {
  id: string;
  market: string;
  tiktok_product_id: string | null;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  categoria: string | null;
  rank: number | null;
  price: number | null;
  precio_mxn: number | null;
  commission: number | null;
  commission_amount: number | null;
  revenue_30d: number | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  creators_count: number | null;
  identity_status: string;
  report_date_range: string | null;
  available_video_count: number;
  analysis_ready_count: number;
  is_current_report: boolean;
}

export interface DiscoveryShop {
  shop_id: string;
  shop_name: string;
  seller_type: string | null;
  market: string;
  report_date_range: string | null;
  rank: number | null;
  revenue: number | null;
  total_sales: number | null;
  revenue_videos: number | null;
  revenue_live: number | null;
  verified_product_count: number;
  available_video_count: number;
}

export interface ProductDiscoveryResult {
  rows: DiscoveryProduct[];
  count: number;
  categories: string[];
  current_period: string | null;
}

export interface ShopDiscoveryResult {
  rows: DiscoveryShop[];
  count: number;
  current_period: string | null;
}

export type ProductDiscoverySort = "ranking" | "revenue_30d" | "commission" | "creators_count";
export const DISCOVERY_PAGE_SIZE = 20;
export const PRODUCT_DISCOVERY_SORTS: { value: ProductDiscoverySort; label: string }[] = [
  { value: "ranking", label: "Ranking actual" },
  { value: "revenue_30d", label: "Más ventas" },
  { value: "commission", label: "Mayor comisión" },
  { value: "creators_count", label: "Más creadores" },
];

/** Hide the import disambiguation suffix in UI; preserve the stored name and identity. */
export function productDisplayName(name: string): string {
  return name.replace(/\s*\[ID:\d+\]$/, "");
}

export function productCommercialMetrics(product: Pick<DiscoveryProduct, "identity_status" | "price" | "precio_mxn" | "commission" | "revenue_30d" | "total_ingresos_mxn" | "total_ventas">) {
  // A video tells us which product it features, never the product's total sales.
  if (product.identity_status === "video_source") return { price: null, commission: null, earnings: null, revenue: null, sales: null };
  const price = product.price ?? product.precio_mxn;
  const commission = product.commission;
  return {
    price,
    commission,
    earnings: price != null && commission != null ? price * commission / 100 : null,
    revenue: product.revenue_30d ?? product.total_ingresos_mxn,
    sales: product.total_ventas,
  };
}

export function discoverySort(value: string | null): ProductDiscoverySort {
  return PRODUCT_DISCOVERY_SORTS.some(option => option.value === value) ? value as ProductDiscoverySort : "ranking";
}

export function discoveryPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && (parsed - 1) * DISCOVERY_PAGE_SIZE <= 2147483647 ? parsed : 1;
}

export function discoveryCount(value: number | null | undefined, language = "es") {
  if (value == null) return "Sin dato";
  return new Intl.NumberFormat(language === "en" ? "en-US" : "es-MX", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}
