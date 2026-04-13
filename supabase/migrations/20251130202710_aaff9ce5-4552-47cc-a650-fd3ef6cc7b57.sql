-- Create favorites_videos table
CREATE TABLE public.favorites_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.daily_feed(id) ON DELETE CASCADE,
  video_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create favorites_products table
CREATE TABLE public.favorites_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create favorites_scripts table
CREATE TABLE public.favorites_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  script_id UUID NOT NULL REFERENCES public.guiones_personalizados(id) ON DELETE CASCADE,
  script_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, script_id)
);

-- Enable RLS
ALTER TABLE public.favorites_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites_videos
CREATE POLICY "Users can view own favorite videos"
  ON public.favorites_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite videos"
  ON public.favorites_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite videos"
  ON public.favorites_videos FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorites_products
CREATE POLICY "Users can view own favorite products"
  ON public.favorites_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite products"
  ON public.favorites_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite products"
  ON public.favorites_products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for favorites_scripts
CREATE POLICY "Users can view own favorite scripts"
  ON public.favorites_scripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite scripts"
  ON public.favorites_scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite scripts"
  ON public.favorites_scripts FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_favorites_videos_user_id ON public.favorites_videos(user_id);
CREATE INDEX idx_favorites_products_user_id ON public.favorites_products(user_id);
CREATE INDEX idx_favorites_scripts_user_id ON public.favorites_scripts(user_id);