-- Step 1: Add featured_today column to daily_feed
ALTER TABLE public.daily_feed 
ADD COLUMN IF NOT EXISTS featured_today BOOLEAN DEFAULT false;

-- Step 2: Create unique index on tiktok_url (this will be our stable identifier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_feed_tiktok_url 
ON public.daily_feed(tiktok_url);

-- Step 3: Drop and recreate favorites_videos with video_url instead of video_id
DROP TABLE IF EXISTS public.favorites_videos CASCADE;

CREATE TABLE public.favorites_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  video_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, video_url)
);

-- Enable RLS
ALTER TABLE public.favorites_videos ENABLE ROW LEVEL SECURITY;

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

-- Create index for performance
CREATE INDEX idx_favorites_videos_user_id ON public.favorites_videos(user_id);
CREATE INDEX idx_favorites_videos_video_url ON public.favorites_videos(video_url);