-- Create videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the videos bucket
CREATE POLICY "Videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    (auth.role() = 'authenticated')
  );

CREATE POLICY "Users can update their own videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'videos' AND
    (auth.uid() = owner OR auth.role() = 'service_role')
  );

CREATE POLICY "Users can delete their own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'videos' AND
    (auth.uid() = owner OR auth.role() = 'service_role')
  );

-- Set up CORS configuration
UPDATE storage.buckets
SET public = true,
    file_size_limit = 104857600, -- 100MB in bytes
    allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime'],
    cors_origins = ARRAY['*'],
    cors_methods = ARRAY['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    cors_headers = ARRAY['*'],
    cors_max_age = 3600
WHERE id = 'videos';

-- Create function to clean up old videos
CREATE OR REPLACE FUNCTION cleanup_old_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'videos'
  AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a scheduled job to run cleanup every day
SELECT cron.schedule(
  'cleanup-old-videos',
  '0 0 * * *', -- Run at midnight every day
  'SELECT cleanup_old_videos()'
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';