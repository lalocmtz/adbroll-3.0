// Shared Kalodata parsing helpers.
//
// Why this file exists:
//   Kalodata periodically adds columns to its CSV/XLSX exports. The old
//   ingestion code was hard-coded to a specific 14-column layout and broke
//   the day Kalodata published a 17-column one. Instead of hard-coding the
//   new schema, every field lookup goes through `pick()` which accepts an
//   array of candidate column names so we can tolerate renames and additions
//   without another round of emergency edits.

export type Row = Record<string, unknown>;

/**
 * Pick the first defined value from a row using a list of candidate column
 * names. Returns `null` when nothing matches so callers can use `??`.
 */
export function pick(row: Row, candidates: string[]): unknown {
  for (const key of candidates) {
    if (key in row) {
      const value = (row as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return null;
}

export function pickString(row: Row, candidates: string[]): string | null {
  const raw = pick(row, candidates);
  if (raw === null) return null;
  const str = String(raw).trim();
  return str.length > 0 ? str : null;
}

/**
 * Parse a numeric value that might arrive as a number, a plain string, a
 * percentage (`"87%"`), or a Kalodata price range (`"267.12-289.48"`).
 * Ranges are averaged. Returns `null` when nothing parseable is found.
 */
export function pickNumber(row: Row, candidates: string[]): number | null {
  const raw = pick(row, candidates);
  if (raw === null) return null;

  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;

  const cleaned = String(raw).replace(/[%$,\s]/g, "").trim();
  if (cleaned.length === 0) return null;

  if (cleaned.includes("-") && !cleaned.startsWith("-")) {
    const [a, b] = cleaned.split("-").map((x) => parseFloat(x));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return (a + b) / 2;
    }
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function pickInt(row: Row, candidates: string[]): number | null {
  const n = pickNumber(row, candidates);
  return n === null ? null : Math.round(n);
}

/**
 * Extract a stable TikTok video ID from a URL like
 * `https://www.tiktok.com/@foo/video/7489123456789012345`.
 * Returns the numeric portion as a string so it survives BigInt boundaries.
 */
export function extractTikTokVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/video\/(\d{6,})/.exec(url);
  return match ? match[1] : null;
}

/**
 * Derive a stable product identifier from a TikTok product URL.
 *   https://shop.tiktok.com/view/product/1729461238495872345
 * If the URL doesn't contain an ID, return the full URL so callers still get
 * *a* deterministic key instead of a fuzzy match.
 */
export function extractTikTokProductId(url: string | null | undefined): string | null {
  if (!url) return null;
  // TikTok Shop: /view/product/<id>
  const direct = /\/product\/(\d{6,})/.exec(url);
  if (direct) return direct[1];
  // Kalodata: /product/detail?id=<id>&...  (el id es el product_id de TikTok Shop)
  const query = /[?&]id=(\d{6,})/.exec(url);
  if (query) return query[1];
  return null;
}


/**
 * Normalize a product or video title for case-insensitive exact matching.
 * We strip emojis, bracketed fragments, and collapse whitespace but we do
 * NOT do stemming / tokenization — we only use this result for `===`
 * comparisons, never substring or Levenshtein.
 */
export function normalizeTitle(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --------------------------------------------------------------------------
// Column aliases (old v1 14-col and new v2 17-col exports)
// --------------------------------------------------------------------------

export const VIDEO_COLUMNS = {
  dateRange: ["Rango de fechas", "Date Range"],
  title: ["Descripción del vídeo", "Descripción del video", "Video Description", "Video Title"],
  duration: ["Duración", "Duration"],
  creatorHandle: ["Usuario del creador", "Creator Username", "Creator"],
  creatorName: ["Nombre del creador", "Creator Name"],
  publishedAt: ["Fecha de publicación", "Publish Date"],
  revenue: ["Ingresos (M$)", "Ingresos", "Revenue", "Revenue (USD)"],
  sales: ["Ventas", "Sales"],
  views: ["Visualizaciones", "Views"],
  gpm: ["GPM (M$) - Ingresos brutos por cada mil visualizaciones", "GPM (M$)", "GPM"],
  cpa: ["CPA (M$) - Coste por acción", "CPA (M$)", "CPA"],
  adRatio: ["Ratio de visualizaciones de Ads", "Ad View Ratio"],
  adCost: ["Coste publicitario (M$)", "Ad Spend"],
  roas: ["ROAS - Retorno de la inversión publicitaria", "ROAS"],
  videoUrl: ["Enlace de TikTok", "TikTok Link", "Video URL"],
  // New in v2 (17 columns)
  productName: ["Nombre del producto", "Título del producto", "Titulo del producto", "Product Name", "Product Title"],
  productUrl: [
    "URL del producto",
    "Product URL",
    "Enlace del producto",
    // Export v3 de Kalodata: el enlace al detalle del producto viene en
    // "Ver en Kalodata" (https://www.kalodata.com/product/detail?id=<tiktok_product_id>).
    "Ver en Kalodata",
    "View on Kalodata",
  ],
  productImage: ["Imagen del producto", "Product Image", "Imagen URL"],
  productId: ["ID del producto", "Product ID", "TikTok Product ID"],


  category: ["Categoría", "Category"],
  country: ["País", "Country"],
} as const;

export const PRODUCT_COLUMNS = {
  name: ["Nombre del producto", "Product Name"],
  url: ["URL del producto", "Product URL"],
  image: ["Imagen URL", "Imagen del producto", "Product Image"],
  category: ["Categoría", "Category"],
  subcategory: ["Subcategoría", "Subcategory"],
  price: ["Precio (M$)", "Precio", "Price"],
  description: ["Descripción", "Description"],
  sales: ["Total Ventas", "Total Sales"],
  revenue: ["Total Ingresos (M$)", "Total Revenue", "Total Ingresos"],
  roas: ["Promedio ROAS", "Avg ROAS"],
  commission: ["Comisión", "Commission"],
  stock: ["Stock", "Inventory"],
  rating: ["Rating", "Calificación"],
  conversionRate: ["Tasa de conversión", "Conversion Rate"],
  tiktokProductId: ["ID del producto", "Product ID", "TikTok Product ID"],
  country: ["País", "Country"],
  currency: ["Moneda", "Currency"],
  shop: ["Tienda", "Shop"],
  launchDate: ["Fecha de lanzamiento", "Launch Date"],
} as const;

export const CREATOR_COLUMNS = {
  handle: ["Usuario del creador", "Creator Username", "Creator Handle"],
  fullName: ["Nombre completo", "Full Name", "Creator Name"],
  followers: ["Seguidores", "Followers"],
  totalVideos: ["Total Videos", "Total Videos", "Videos Count"],
  totalSales: ["Total Ventas", "Total Sales"],
  totalRevenue: ["Total Ingresos (M$)", "Total Revenue"],
  avgViews: ["Promedio Visualizaciones", "Avg Views"],
  avgRoas: ["Promedio ROAS", "Avg ROAS"],
  bestVideoUrl: ["Mejor Video URL", "Best Video URL"],
  country: ["País", "Country"],
  verified: ["Verificado", "Verified"],
  category: ["Categoría", "Category"],
  engagementRate: ["Tasa de engagement", "Engagement Rate"],
  avgGpm: ["GPM promedio", "Avg GPM"],
  bio: ["Biografía", "Bio"],
  profileUrl: ["URL del perfil", "Profile URL"],
  liveSales: ["Ventas en live", "Live Sales"],
  videoSales: ["Ventas en video", "Video Sales"],
} as const;

/**
 * Detect which Kalodata format we are looking at by inspecting the first
 * row's keys. Only used for logging / telemetry so the Admin panel can show
 * "detected v2 17-column export" when explaining a successful run.
 */
export function detectFormat(rows: Row[], kind: "videos" | "products" | "creators"): string {
  if (!rows.length) return "empty";
  const colCount = Object.keys(rows[0]).length;

  if (kind === "videos") {
    const hasProduct = "Nombre del producto" in rows[0];
    if (colCount >= 17 || hasProduct) return `v2_${colCount}col`;
    return `v1_${colCount}col`;
  }
  if (kind === "products") {
    if (colCount >= 19) return `v2_${colCount}col`;
    return `v1_${colCount}col`;
  }
  if (kind === "creators") {
    if (colCount >= 18) return `v2_${colCount}col`;
    return `v1_${colCount}col`;
  }
  return `unknown_${colCount}col`;
}
