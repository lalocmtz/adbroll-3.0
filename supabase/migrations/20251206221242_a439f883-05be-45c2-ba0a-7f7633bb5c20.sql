-- Create assets bucket for marketing resources (landing videos, images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('assets', 'assets', true, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to assets
CREATE POLICY "Public can view assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assets');

-- Allow founders to upload assets
CREATE POLICY "Founders can upload assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND public.has_role(auth.uid(), 'founder')
);

-- Allow founders to update assets
CREATE POLICY "Founders can update assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assets' 
  AND public.has_role(auth.uid(), 'founder')
);

-- Allow founders to delete assets
CREATE POLICY "Founders can delete assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assets' 
  AND public.has_role(auth.uid(), 'founder')
);