-- Tablas de staging temporales para cargar el snapshot de Kalodata (MX).
-- Se eliminan al terminar la carga. Sin acceso publico.
CREATE TABLE IF NOT EXISTS public.kalodata_staging_videos (
  video_url text,
  tiktok_video_id text,
  tiktok_product_id text,
  source_product_url text,
  rank integer,
  title text,
  product_name text,
  creator_name text,
  creator_handle text,
  sales integer,
  revenue_mxn numeric,
  views integer,
  roas numeric,
  country text,
  snapshot_date_range text
);

CREATE TABLE IF NOT EXISTS public.kalodata_staging_creators (
  creator_handle text,
  usuario_creador text,
  nombre_completo text,
  seguidores integer,
  total_ingresos_mxn numeric,
  total_videos integer,
  promedio_visualizaciones integer,
  total_live_count integer,
  gmv_live_mxn numeric,
  revenue_live numeric,
  revenue_videos numeric,
  tiktok_url text,
  country text
);

GRANT ALL ON public.kalodata_staging_videos TO service_role;
GRANT ALL ON public.kalodata_staging_creators TO service_role;

ALTER TABLE public.kalodata_staging_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kalodata_staging_creators ENABLE ROW LEVEL SECURITY;