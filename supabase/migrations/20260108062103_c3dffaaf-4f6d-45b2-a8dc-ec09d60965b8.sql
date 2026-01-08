-- Create storage bucket for generated content (images for lip-sync, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-content', 'generated-content', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own content
CREATE POLICY "Users can upload generated content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-content' AND (storage.foldername(name))[1] = 'lipsync-images');

-- Allow service role to upload (for edge functions)
CREATE POLICY "Service role can upload generated content"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'generated-content');

-- Allow public read access to generated content
CREATE POLICY "Public read access to generated content"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-content');