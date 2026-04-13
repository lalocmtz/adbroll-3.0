-- ================================================================
-- PHASE 1: Deterministic Kalodata ingestion
-- ================================================================
-- Goals:
--   1. Natural keys for videos (tiktok_video_id) and products (tiktok_product_id)
--   2. Track product stubs auto-created from video imports (from_video)
--   3. Track last import timestamp + row source for data quality
--   4. Backfill tiktok_video_id from existing video_url rows
-- ================================================================

-- ------------------------------------------------------------------
-- 1. videos: natural key + import tracking
-- ------------------------------------------------------------------
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS tiktok_video_id text,
  ADD COLUMN IF NOT EXISTS matched_by text,
  ADD COLUMN IF NOT EXISTS last_import timestamptz,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'kalodata';

-- Backfill tiktok_video_id from video_url (pattern: /video/<digits>)
UPDATE public.videos
SET tiktok_video_id = substring(video_url from '/video/(\d+)')
WHERE tiktok_video_id IS NULL AND video_url IS NOT NULL;

-- Unique index on tiktok_video_id (partial: only where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_tiktok_video_id_unique
  ON public.videos (tiktok_video_id)
  WHERE tiktok_video_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_last_import ON public.videos (last_import DESC);
CREATE INDEX IF NOT EXISTS idx_videos_matched_by ON public.videos (matched_by);

-- ------------------------------------------------------------------
-- 2. products: stubs + import tracking
-- ------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS from_video boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'kalodata',
  ADD COLUMN IF NOT EXISTS video_count integer DEFAULT 0;

-- Unique index on producto_url when not null (deterministic match by URL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_producto_url_unique
  ON public.products (producto_url)
  WHERE producto_url IS NOT NULL;

-- Unique index on tiktok_product_id when not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tiktok_product_id_unique
  ON public.products (tiktok_product_id)
  WHERE tiktok_product_id IS NOT NULL;

-- Case-insensitive index on producto_nombre for name-based lookups
CREATE INDEX IF NOT EXISTS idx_products_producto_nombre_lower
  ON public.products (lower(producto_nombre));

-- ------------------------------------------------------------------
-- 3. daily_feed: align with videos (natural key + tracking)
-- ------------------------------------------------------------------
ALTER TABLE public.daily_feed
  ADD COLUMN IF NOT EXISTS tiktok_video_id text,
  ADD COLUMN IF NOT EXISTS matched_by text,
  ADD COLUMN IF NOT EXISTS last_import timestamptz;

UPDATE public.daily_feed
SET tiktok_video_id = substring(tiktok_url from '/video/(\d+)')
WHERE tiktok_video_id IS NULL AND tiktok_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_feed_tiktok_video_id_unique
  ON public.daily_feed (tiktok_video_id)
  WHERE tiktok_video_id IS NOT NULL;

-- ------------------------------------------------------------------
-- 4. imports log: already exists from earlier migration.
--    Ensure it has the columns we need for the Admin data quality panel.
-- ------------------------------------------------------------------
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS kind text,                     -- 'videos' | 'products' | 'creators'
  ADD COLUMN IF NOT EXISTS matched_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stub_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unmatched_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS detected_format text;          -- 'v1_14col' | 'v2_17col' | etc.

CREATE INDEX IF NOT EXISTS idx_imports_created_at ON public.imports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imports_kind ON public.imports (kind);

-- Allow authenticated users to read import history for the admin panel
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can view imports" ON public.imports;
CREATE POLICY "Founders can view imports"
  ON public.imports
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Service role manages imports" ON public.imports;
CREATE POLICY "Service role manages imports"
  ON public.imports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------
-- 5. Trigger: keep products.video_count in sync with videos.product_id
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_product_video_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.product_id IS NOT NULL THEN
      UPDATE public.products
        SET video_count = video_count + 1
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.product_id IS DISTINCT FROM NEW.product_id THEN
      IF OLD.product_id IS NOT NULL THEN
        UPDATE public.products
          SET video_count = GREATEST(video_count - 1, 0)
          WHERE id = OLD.product_id;
      END IF;
      IF NEW.product_id IS NOT NULL THEN
        UPDATE public.products
          SET video_count = video_count + 1
          WHERE id = NEW.product_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.product_id IS NOT NULL THEN
      UPDATE public.products
        SET video_count = GREATEST(video_count - 1, 0)
        WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_sync_product_count ON public.videos;
CREATE TRIGGER trg_videos_sync_product_count
  AFTER INSERT OR UPDATE OR DELETE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_video_count();

-- One-off reconcile so existing rows have a correct count.
UPDATE public.products p
SET video_count = sub.cnt
FROM (
  SELECT product_id, count(*)::int AS cnt
  FROM public.videos
  WHERE product_id IS NOT NULL
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;
