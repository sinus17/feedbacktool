/*
  # Increase video file size limit to 200MB
  
  1. Changes
    - Update videos bucket file_size_limit from 100MB to 200MB
    - Maintain existing CORS and mime type configurations
  
  2. Security
    - No changes to RLS policies needed
    - Maintains existing authentication requirements
*/

-- Update the videos bucket to allow 200MB file uploads
UPDATE storage.buckets
SET file_size_limit = 209715200 -- 200MB in bytes (200 * 1024 * 1024)
WHERE id = 'videos';

-- Verify the update
DO $$
DECLARE
    current_limit bigint;
BEGIN
    SELECT file_size_limit INTO current_limit 
    FROM storage.buckets 
    WHERE id = 'videos';
    
    IF current_limit = 209715200 THEN
        RAISE NOTICE 'Videos bucket file size limit successfully updated to 200MB (% bytes)', current_limit;
    ELSE
        RAISE WARNING 'Failed to update videos bucket file size limit. Current limit: % bytes', current_limit;
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
