-- Add AI script generation fields to daily_feed table
ALTER TABLE public.daily_feed
ADD COLUMN IF NOT EXISTS ai_variants jsonb,
ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone;

-- Create index for faster queries on generated_at
CREATE INDEX IF NOT EXISTS idx_daily_feed_generated_at ON public.daily_feed(generated_at);

-- Add comment to explain the structure
COMMENT ON COLUMN public.daily_feed.ai_variants IS 'Stores multiple AI-generated script variants as JSON array of objects with variant text and generation timestamp';