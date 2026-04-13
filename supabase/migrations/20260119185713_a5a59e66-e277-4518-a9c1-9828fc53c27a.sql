-- Add column for permanently stored avatar URL
ALTER TABLE creators ADD COLUMN IF NOT EXISTS avatar_storage_url text;