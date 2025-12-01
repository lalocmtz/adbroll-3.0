-- Add commission field to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS commission numeric;

-- Add product_id field to videos table with foreign key
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Add product_id field to daily_feed table with foreign key  
ALTER TABLE public.daily_feed
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_product_id ON public.videos(product_id);
CREATE INDEX IF NOT EXISTS idx_daily_feed_product_id ON public.daily_feed(product_id);