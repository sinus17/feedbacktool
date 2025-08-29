/*
  # Fix video format compatibility issues
  
  1. Changes
    - Add a function to handle video format validation
    - Ensure proper error messages for unsupported formats
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to validate video formats
CREATE OR REPLACE FUNCTION validate_video_format(mime_type text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Initialize result
  result := jsonb_build_object(
    'is_valid', TRUE,
    'error_message', NULL,
    'supported_formats', ARRAY['video/mp4', 'video/webm']
  );
  
  -- Check if it's a supported format
  IF mime_type NOT IN ('video/mp4', 'video/webm') THEN
    result := jsonb_build_object(
      'is_valid', FALSE,
      'error_message', 'This video format is not supported. Please use MP4 or WebM format.',
      'supported_formats', ARRAY['video/mp4', 'video/webm']
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';