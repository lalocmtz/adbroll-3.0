-- Add market column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'mx';

-- Add index for market filtering
CREATE INDEX IF NOT EXISTS idx_products_market ON public.products(market);

-- Add index for videos market filtering (already has country column but use it as market)
CREATE INDEX IF NOT EXISTS idx_videos_market ON public.videos(country);

-- Add index for creators market filtering
CREATE INDEX IF NOT EXISTS idx_creators_market ON public.creators(country);