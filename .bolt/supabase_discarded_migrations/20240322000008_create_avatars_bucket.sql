-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatar images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.role() = 'authenticated')
  );

CREATE POLICY "Users can update their own avatar image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (auth.uid() = owner OR auth.role() = 'service_role')
  );

CREATE POLICY "Users can delete their own avatar image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (auth.uid() = owner OR auth.role() = 'service_role')
  );

-- Set up CORS configuration
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880, -- 5MB in bytes
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif'],
    cors_origins = ARRAY['*'],
    cors_methods = ARRAY['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    cors_headers = ARRAY['*'],
    cors_max_age = 3600
WHERE id = 'avatars';