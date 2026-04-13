-- Add download_attempts column to track failed download retries
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS download_attempts INTEGER DEFAULT 0;

-- Create index for efficient querying of videos by attempts
CREATE INDEX IF NOT EXISTS idx_videos_download_attempts ON public.videos(download_attempts) WHERE video_mp4_url IS NULL;