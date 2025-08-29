/*
  # Add direct_upload platform and improve content display
  
  1. New Features
    - Add 'direct_upload' platform type to ad_creatives table
    - Create function to detect Supabase storage URLs
    - Add trigger to automatically set platform for direct uploads
    - Add indexes for merged content URLs
  
  2. Changes
    - Update platform check constraint to include 'direct_upload'
    - Set platform to 'direct_upload' for Supabase storage URLs
    - Improve display of merged Instagram URLs and TikTok auth codes
*/

-- Create a function to check if a URL is from Supabase storage
CREATE OR REPLACE FUNCTION is_supabase_storage_url(url text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    url LIKE '%supabase.co/storage/v1/object/public/%' OR
    url LIKE '%supabase.in%' OR
    url LIKE '%storage.googleapis.com%'
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to set platform based on URL
CREATE OR REPLACE FUNCTION set_platform_for_direct_uploads()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the content URL is a Supabase storage URL
  IF is_supabase_storage_url(NEW.content) THEN
    -- Set platform to 'direct_upload' instead of 'dropbox'
    NEW.platform = 'direct_upload';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the ad_creatives table
DROP TRIGGER IF EXISTS set_platform_for_direct_uploads_trigger ON public.ad_creatives;
CREATE TRIGGER set_platform_for_direct_uploads_trigger
BEFORE INSERT OR UPDATE OF content ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION set_platform_for_direct_uploads();

-- Update the platform check constraint to include 'direct_upload'
ALTER TABLE public.ad_creatives 
  DROP CONSTRAINT IF EXISTS ad_creatives_platform_check;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_platform_check 
  CHECK (platform IN ('instagram', 'tiktok', 'dropbox', 'direct_upload'));

-- Update existing records to use the correct platform value
UPDATE public.ad_creatives
SET platform = 'direct_upload'
WHERE is_supabase_storage_url(content) AND platform = 'dropbox';

-- Ensure indexes exist for merged content columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_url ON public.ad_creatives(merged_instagram_reel_url);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_code ON public.ad_creatives(merged_tiktok_auth_code);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';