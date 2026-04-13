-- Add new columns for Lives data from Kalodata
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS total_live_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS gmv_live_mxn numeric DEFAULT 0;

-- Remove likes_30d as we're replacing it with lives data
COMMENT ON COLUMN public.creators.likes_30d IS 'Deprecated - replaced by total_live_count';
