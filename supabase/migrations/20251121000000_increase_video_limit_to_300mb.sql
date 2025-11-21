/*
  # Increase video file size limit to 300MB
  
  1. Changes
    - Update videos bucket file_size_limit from 200MB to 300MB
    - Maintain existing CORS and mime type configurations
  
  2. Security
    - No changes to existing RLS policies
    - Maintains existing authentication requirements
*/

-- Update the videos bucket to allow 300MB file uploads
UPDATE storage.buckets
SET file_size_limit = 314572800 -- 300MB in bytes (300 * 1024 * 1024)
WHERE id = 'videos';

-- Verify the update
DO $$
DECLARE
    current_limit bigint;
BEGIN
    SELECT file_size_limit INTO current_limit
    FROM storage.buckets
    WHERE id = 'videos';
    
    IF current_limit = 314572800 THEN
        RAISE NOTICE 'Videos bucket file size limit successfully updated to 300MB (% bytes)', current_limit;
    ELSE
        RAISE WARNING 'Failed to update videos bucket file size limit. Current limit: % bytes', current_limit;
    END IF;
END $$;
