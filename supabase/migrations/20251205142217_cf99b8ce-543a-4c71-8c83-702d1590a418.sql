-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS products_producto_nombre_idx ON products (producto_nombre);
CREATE INDEX IF NOT EXISTS creators_creator_handle_idx ON creators (creator_handle);
CREATE INDEX IF NOT EXISTS videos_product_id_idx ON videos (product_id);
CREATE INDEX IF NOT EXISTS videos_creator_handle_idx ON videos (creator_handle);
CREATE INDEX IF NOT EXISTS videos_video_url_idx ON videos (video_url);

-- Add creator_id column to videos if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE videos ADD COLUMN creator_id uuid REFERENCES creators(id);
  END IF;
END $$;

-- Create index for creator_id
CREATE INDEX IF NOT EXISTS videos_creator_id_idx ON videos (creator_id);