-- Create storage bucket for release sheet files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'release-sheet-files',
  'release-sheet-files',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg']
);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload release sheet files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'release-sheet-files' 
  AND auth.role() = 'authenticated'
);

-- Create policy to allow public read access to files
CREATE POLICY "Allow public read access to release sheet files" ON storage.objects
FOR SELECT USING (bucket_id = 'release-sheet-files');

-- Create policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own release sheet files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'release-sheet-files' 
  AND auth.role() = 'authenticated'
);
