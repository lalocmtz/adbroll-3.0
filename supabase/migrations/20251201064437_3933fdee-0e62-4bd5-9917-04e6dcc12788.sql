-- Add product-related columns to videos table if they don't exist
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS product_price numeric,
ADD COLUMN IF NOT EXISTS product_sales integer,
ADD COLUMN IF NOT EXISTS product_revenue numeric;