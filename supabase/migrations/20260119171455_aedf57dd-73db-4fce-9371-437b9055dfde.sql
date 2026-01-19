-- Add RLS policy to allow authenticated users to upload to ugc folder
CREATE POLICY "Users can upload to ugc folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-content' AND 
  (storage.foldername(name))[1] = 'ugc'
);