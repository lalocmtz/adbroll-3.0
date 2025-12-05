-- Add new columns to videos table for MP4-based architecture
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS video_mp4_url text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS duration numeric,
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS analysis_json jsonb,
ADD COLUMN IF NOT EXISTS variants_json jsonb,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';

-- Create storage buckets for videos and thumbnails
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for public read access
CREATE POLICY "Public read access for videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Service role can upload videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Service role can update videos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'videos');

CREATE POLICY "Service role can delete videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos');

CREATE POLICY "Public read access for thumbnails" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'thumbnails');

CREATE POLICY "Service role can upload thumbnails" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Service role can update thumbnails" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'thumbnails');

CREATE POLICY "Service role can delete thumbnails" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'thumbnails');