-- Add visual analysis columns to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS visual_product_detected text,
ADD COLUMN IF NOT EXISTS visual_confidence numeric,
ADD COLUMN IF NOT EXISTS visual_keywords text[],
ADD COLUMN IF NOT EXISTS visual_analyzed_at timestamp with time zone;

-- Create index for efficient queries on visual data
CREATE INDEX IF NOT EXISTS idx_videos_visual_analyzed 
ON public.videos (visual_analyzed_at) 
WHERE visual_analyzed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_visual_confidence 
ON public.videos (visual_confidence) 
WHERE visual_confidence IS NOT NULL;