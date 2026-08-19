-- Fase 1: backbone de datos y auditoría de matching (100% aditivo)

-- 1) Columnas de trazabilidad en videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS tiktok_product_id text,
  ADD COLUMN IF NOT EXISTS source_product_url text,
  ADD COLUMN IF NOT EXISTS match_status text,
  ADD COLUMN IF NOT EXISTS match_method text,
  ADD COLUMN IF NOT EXISTS match_confidence numeric,
  ADD COLUMN IF NOT EXISTS match_algorithm_version text;

CREATE INDEX IF NOT EXISTS idx_videos_tiktok_product_id
  ON public.videos (tiktok_product_id) WHERE tiktok_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_match_status
  ON public.videos (match_status);

-- 2) Metadatos de import (rango de fechas / publicación del snapshot)
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS date_range text,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 3) Rango de fechas en el histórico de ranking
ALTER TABLE public.daily_rankings
  ADD COLUMN IF NOT EXISTS snapshot_date_range text;

-- 4) Auditoría de matching
CREATE TABLE IF NOT EXISTS public.video_match_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  market text,
  match_status text NOT NULL,
  match_method text NOT NULL,
  match_confidence numeric,
  match_algorithm_version text,
  tiktok_product_id text,
  source_product_url text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.video_match_audit TO service_role;
GRANT SELECT ON public.video_match_audit TO authenticated;

ALTER TABLE public.video_match_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders can read match audit" ON public.video_match_audit;
CREATE POLICY "founders can read match audit"
  ON public.video_match_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_video_match_audit_video ON public.video_match_audit (video_id, created_at DESC);