-- Add product information fields to daily_feed table
ALTER TABLE public.daily_feed 
ADD COLUMN IF NOT EXISTS producto_nombre TEXT,
ADD COLUMN IF NOT EXISTS producto_url TEXT;