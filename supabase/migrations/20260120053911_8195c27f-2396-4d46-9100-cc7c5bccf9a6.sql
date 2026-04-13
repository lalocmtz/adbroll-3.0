-- Add manual match tracking columns to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS manual_match boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_matched_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS manual_matched_by uuid REFERENCES auth.users(id);

-- Create index for efficient querying of manually matched videos
CREATE INDEX IF NOT EXISTS idx_videos_manual_match ON public.videos(manual_match) WHERE manual_match = true;