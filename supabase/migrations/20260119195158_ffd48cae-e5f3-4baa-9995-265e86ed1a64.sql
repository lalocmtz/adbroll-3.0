-- Add unique constraint on video_url for reliable upsert
-- First, clean up any exact duplicates (keep lowest id)
DELETE FROM videos a
USING videos b
WHERE a.video_url = b.video_url
  AND a.id > b.id;

-- Create unique index on video_url
CREATE UNIQUE INDEX IF NOT EXISTS videos_video_url_unique_idx ON videos(video_url);
