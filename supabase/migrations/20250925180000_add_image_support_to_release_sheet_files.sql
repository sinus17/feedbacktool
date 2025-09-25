-- Add image MIME types to release-sheet-files bucket
-- This allows the bucket to accept both audio and image files

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Audio types (existing)
  'audio/mpeg', 
  'audio/wav', 
  'audio/mp4', 
  'audio/x-m4a', 
  'audio/flac', 
  'audio/ogg',
  -- Image types (new)
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]
WHERE id = 'release-sheet-files';

-- Verify the update
DO $$
DECLARE
    mime_types text[];
BEGIN
    SELECT allowed_mime_types INTO mime_types 
    FROM storage.buckets 
    WHERE id = 'release-sheet-files';
    
    IF 'image/jpeg' = ANY(mime_types) THEN
        RAISE NOTICE 'Successfully added image support to release-sheet-files bucket. Supported types: %', mime_types;
    ELSE
        RAISE WARNING 'Failed to add image support to release-sheet-files bucket. Current types: %', mime_types;
    END IF;
END $$;
