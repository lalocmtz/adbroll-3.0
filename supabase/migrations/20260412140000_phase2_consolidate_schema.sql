-- ================================================================
-- PHASE 2: Surgical schema cleanup
-- ================================================================
-- Phase 1 left us with two parallel video tables (`videos` English cols
-- and `daily_feed` Spanish cols) because the ingestion dual-wrote both.
-- Phase 2 picks `daily_feed` as the single source of truth: it has the
-- richer business fields the UI already depends on (cpa_mxn, roas,
-- gpm_mxn, rango_fechas, fecha_publicacion, duracion, ai_variants,
-- guion_ia, transcripcion_original) and 4 of the 5 video consumers
-- already query it directly.
--
-- This migration:
--   1. Extends `daily_feed` with the handful of columns the Dashboard
--      needs from the old `videos` table (category, country,
--      product_price/sales/revenue snapshots).
--   2. Backfills `daily_feed` from any `videos` rows that don't yet
--      have a match by natural key.
--   3. Moves the `video_count` sync trigger off `videos` and onto
--      `daily_feed` so the counter stays authoritative.
--   4. Drops `videos` entirely.
--   5. Drops the generic `favorites` table (unused — the app uses the
--      typed `favorites_videos` / `favorites_products` / `favorites_scripts`
--      tables instead).
-- ================================================================

-- ------------------------------------------------------------------
-- 1. Extend daily_feed with the columns Dashboard needs.
-- ------------------------------------------------------------------
ALTER TABLE public.daily_feed
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS product_price numeric,
  ADD COLUMN IF NOT EXISTS product_sales integer,
  ADD COLUMN IF NOT EXISTS product_revenue numeric,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'kalodata';

CREATE INDEX IF NOT EXISTS idx_daily_feed_category ON public.daily_feed (category);
CREATE INDEX IF NOT EXISTS idx_daily_feed_last_import ON public.daily_feed (last_import DESC);
CREATE INDEX IF NOT EXISTS idx_daily_feed_matched_by ON public.daily_feed (matched_by);

-- ------------------------------------------------------------------
-- 2. Backfill daily_feed from videos rows that have no counterpart.
--    We match on tiktok_video_id since Phase 1 backfilled that on both
--    sides. Rows that already exist in daily_feed win (they have richer
--    data), orphans in videos get copied across with best-effort mapping.
-- ------------------------------------------------------------------
INSERT INTO public.daily_feed (
  tiktok_video_id,
  tiktok_url,
  descripcion_video,
  creador,
  fecha_publicacion,
  duracion,
  rango_fechas,
  ingresos_mxn,
  ventas,
  visualizaciones,
  cpa_mxn,
  coste_publicitario_mxn,
  roas,
  product_id,
  producto_nombre,
  matched_by,
  last_import,
  category,
  country,
  product_price,
  product_sales,
  product_revenue,
  source
)
SELECT
  v.tiktok_video_id,
  v.video_url,
  COALESCE(v.title, ''),
  COALESCE(v.creator_name, v.creator_handle, ''),
  COALESCE(v.imported_at::text, ''),
  '',
  '',
  COALESCE(v.revenue_mxn, 0),
  COALESCE(v.sales, 0),
  COALESCE(v.views, 0),
  CASE WHEN v.sales > 0 THEN v.revenue_mxn / v.sales ELSE 0 END,
  0,
  COALESCE(v.roas, 0),
  v.product_id,
  v.product_name,
  v.matched_by,
  v.last_import,
  v.category,
  v.country,
  v.product_price,
  v.product_sales,
  v.product_revenue,
  COALESCE(v.source, 'kalodata')
FROM public.videos v
WHERE v.tiktok_video_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.daily_feed d
    WHERE d.tiktok_video_id = v.tiktok_video_id
  )
ON CONFLICT (tiktok_video_id) WHERE tiktok_video_id IS NOT NULL DO NOTHING;

-- Also fold the category/country/product snapshot columns into any
-- rows that DO exist in daily_feed but don't yet have them.
UPDATE public.daily_feed d
SET
  category = COALESCE(d.category, v.category),
  country = COALESCE(d.country, v.country),
  product_price = COALESCE(d.product_price, v.product_price),
  product_sales = COALESCE(d.product_sales, v.product_sales),
  product_revenue = COALESCE(d.product_revenue, v.product_revenue)
FROM public.videos v
WHERE d.tiktok_video_id IS NOT NULL
  AND d.tiktok_video_id = v.tiktok_video_id;

-- ------------------------------------------------------------------
-- 3. Re-home the video_count sync trigger onto daily_feed.
--    (Phase 1 created it on videos; dropping videos takes the trigger
--    with it.)
-- ------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_daily_feed_sync_product_count ON public.daily_feed;
CREATE TRIGGER trg_daily_feed_sync_product_count
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_feed
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_video_count();

-- Re-reconcile from daily_feed so the counter is authoritative.
UPDATE public.products p
SET video_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT product_id, count(*)::int AS cnt
  FROM public.daily_feed
  WHERE product_id IS NOT NULL
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;

UPDATE public.products p
SET video_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.daily_feed d WHERE d.product_id = p.id
);

-- ------------------------------------------------------------------
-- 4. Drop the redundant `videos` table (and its trigger is gone with it).
-- ------------------------------------------------------------------
DROP TABLE IF EXISTS public.videos CASCADE;

-- ------------------------------------------------------------------
-- 5. Drop the unused generic `favorites` table.
--    The app uses favorites_videos / favorites_products / favorites_scripts.
-- ------------------------------------------------------------------
DROP TABLE IF EXISTS public.favorites CASCADE;
