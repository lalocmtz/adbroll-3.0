-- Add new columns for enhanced creator data from Kalodata
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS likes_30d integer DEFAULT 0;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS revenue_live numeric DEFAULT 0;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS revenue_videos numeric DEFAULT 0;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS tiktok_url text;