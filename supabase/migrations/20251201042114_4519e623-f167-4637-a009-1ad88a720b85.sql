-- Create videos table (new)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER,
  video_url TEXT NOT NULL,
  title TEXT,
  creator_handle TEXT,
  creator_name TEXT,
  product_name TEXT,
  category TEXT,
  country TEXT,
  views INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  revenue_mxn NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now()
);

-- Add index on creator_handle for videos
CREATE INDEX IF NOT EXISTS idx_videos_creator_handle ON public.videos(creator_handle);

-- Enable RLS on videos
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS policy for videos (authenticated users can view)
CREATE POLICY "Authenticated users can view videos"
ON public.videos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Service role can manage videos
CREATE POLICY "Service role can manage videos"
ON public.videos FOR ALL
USING (true)
WITH CHECK (true);

-- Update creators table (add new columns, keep existing ones)
ALTER TABLE public.creators 
  ADD COLUMN IF NOT EXISTS creator_handle TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS last_import TIMESTAMPTZ DEFAULT now();

-- Create unique index on creator_handle if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_handle_unique ON public.creators(creator_handle) WHERE creator_handle IS NOT NULL;

-- Update products table (add new columns, keep existing ones)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tiktok_product_id TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS is_opportunity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_import TIMESTAMPTZ DEFAULT now();

-- Create imports table (new)
CREATE TABLE IF NOT EXISTS public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  videos_imported INTEGER DEFAULT 0,
  products_imported INTEGER DEFAULT 0,
  creators_imported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on imports
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- RLS policy for imports (authenticated users can view)
CREATE POLICY "Authenticated users can view imports"
ON public.imports FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Service role can manage imports
CREATE POLICY "Service role can manage imports"
ON public.imports FOR ALL
USING (true)
WITH CHECK (true);