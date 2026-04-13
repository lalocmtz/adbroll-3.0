-- Add new columns to products table for incremental imports
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS last_imported_from_kalodata_at timestamptz,
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gmv_7d_mxn numeric,
ADD COLUMN IF NOT EXISTS gmv_30d_mxn numeric,
ADD COLUMN IF NOT EXISTS creators_active_30d integer;

-- Add new columns to creators table
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS last_imported_from_kalodata_at timestamptz,
ADD COLUMN IF NOT EXISTS views_30d integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_30d integer DEFAULT 0;

-- Add new columns to videos table for AI matching tracking
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS ai_match_attempted_at timestamptz,
ADD COLUMN IF NOT EXISTS ai_match_confidence numeric,
ADD COLUMN IF NOT EXISTS snapshot_date_range text,
ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

-- Create unique indexes for UPSERT operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_url 
ON public.products(producto_nombre, producto_url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_handle 
ON public.creators(usuario_creador);

CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_tiktok_url 
ON public.videos(video_url);

-- Create index for faster product matching
CREATE INDEX IF NOT EXISTS idx_videos_product_id 
ON public.videos(product_id);

CREATE INDEX IF NOT EXISTS idx_videos_creator_handle 
ON public.videos(creator_handle);

-- Create view for Opportunity Index (IO) calculation
CREATE OR REPLACE VIEW product_opportunities AS
SELECT
  p.*,
  COALESCE(p.commission, 0) AS commission_percent_calc,
  COALESCE(p.revenue_30d, p.total_ingresos_mxn, 0) AS gmv_30d_calc,
  COALESCE(p.creators_count, p.creators_active_30d, 1) AS creators_active_calc,
  CASE 
    WHEN COALESCE(p.creators_count, p.creators_active_30d, 1) > 0 
    THEN (COALESCE(p.commission, 6) * COALESCE(p.revenue_30d, p.total_ingresos_mxn, 0)) / (COALESCE(p.creators_count, p.creators_active_30d, 1) + 1)
    ELSE 0
  END AS opportunity_index,
  CASE 
    WHEN COALESCE(p.commission, 0) > 15 
      AND COALESCE(p.revenue_30d, p.total_ingresos_mxn, 0) > 0 
      AND COALESCE(p.creators_count, p.creators_active_30d, 100) < 50 
    THEN true
    ELSE false
  END AS is_hidden_gem
FROM products p;