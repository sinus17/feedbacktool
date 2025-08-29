/*
  # Add validation function for social media URLs
  
  1. New Functions
    - `is_social_media_url`: Checks if a URL is from Instagram or a TikTok auth code
    - This function will be used for validation in the application
  
  2. Security
    - Function is marked as SECURITY DEFINER to ensure consistent execution
    - No changes to RLS policies needed
*/

-- Create a function to check if a URL is from Instagram or a TikTok auth code
CREATE OR REPLACE FUNCTION is_social_media_url(url text)
RETURNS boolean AS $$
BEGIN
  -- Check if it's an Instagram URL
  IF url LIKE '%instagram.com%/reel/%' OR url LIKE '%instagram.com%/p/%' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if it's a TikTok auth code (starts with #)
  IF url LIKE '#%' THEN
    RETURN TRUE;
  END IF;
  
  -- Not a social media URL
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate feedback input
CREATE OR REPLACE FUNCTION validate_feedback_input(input text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Initialize result
  result := jsonb_build_object(
    'is_valid', TRUE,
    'error_message', NULL,
    'type', NULL
  );
  
  -- Check if input is empty
  IF input IS NULL OR trim(input) = '' THEN
    RETURN result;
  END IF;
  
  -- Check if it's an Instagram URL
  IF input LIKE '%instagram.com%/reel/%' OR input LIKE '%instagram.com%/p/%' THEN
    result := jsonb_build_object(
      'is_valid', FALSE,
      'error_message', 'Instagram URLs should be submitted in the Ad Creatives section, not here.',
      'type', 'instagram'
    );
    RETURN result;
  END IF;
  
  -- Check if it's a TikTok auth code
  IF input LIKE '#%' THEN
    result := jsonb_build_object(
      'is_valid', FALSE,
      'error_message', 'TikTok auth codes should be submitted in the Ad Creatives section, not here.',
      'type', 'tiktok'
    );
    RETURN result;
  END IF;
  
  -- Input is valid
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';