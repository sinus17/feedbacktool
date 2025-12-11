-- Add timestamp columns to track when Instagram/TikTok URLs were last updated
-- This allows us to identify which URLs are new and haven't been used yet

ALTER TABLE public.ad_creatives
ADD COLUMN IF NOT EXISTS instagram_url_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tiktok_url_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activated_at TIMESTAMPTZ;

-- Add indexes for the new timestamp columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_url_updated_at ON public.ad_creatives(instagram_url_updated_at);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_url_updated_at ON public.ad_creatives(tiktok_url_updated_at);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_last_activated_at ON public.ad_creatives(last_activated_at);

-- Create a trigger function to automatically update instagram_url_updated_at when merged_instagram_reel_url changes
CREATE OR REPLACE FUNCTION update_instagram_url_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the Instagram URL actually changed
  IF (OLD.merged_instagram_reel_url IS NULL AND NEW.merged_instagram_reel_url IS NOT NULL) OR
     (OLD.merged_instagram_reel_url IS NOT NULL AND NEW.merged_instagram_reel_url IS NOT NULL AND 
      OLD.merged_instagram_reel_url != NEW.merged_instagram_reel_url) THEN
    NEW.instagram_url_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically update tiktok_url_updated_at when merged_tiktok_auth_code changes
CREATE OR REPLACE FUNCTION update_tiktok_url_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the TikTok code actually changed
  IF (OLD.merged_tiktok_auth_code IS NULL AND NEW.merged_tiktok_auth_code IS NOT NULL) OR
     (OLD.merged_tiktok_auth_code IS NOT NULL AND NEW.merged_tiktok_auth_code IS NOT NULL AND 
      OLD.merged_tiktok_auth_code != NEW.merged_tiktok_auth_code) THEN
    NEW.tiktok_url_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update last_activated_at when status changes to 'active'
CREATE OR REPLACE FUNCTION update_last_activated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    NEW.last_activated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_instagram_url_timestamp_trigger ON public.ad_creatives;
DROP TRIGGER IF EXISTS update_tiktok_url_timestamp_trigger ON public.ad_creatives;
DROP TRIGGER IF EXISTS update_last_activated_timestamp_trigger ON public.ad_creatives;

-- Create triggers
CREATE TRIGGER update_instagram_url_timestamp_trigger
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION update_instagram_url_timestamp();

CREATE TRIGGER update_tiktok_url_timestamp_trigger
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION update_tiktok_url_timestamp();

CREATE TRIGGER update_last_activated_timestamp_trigger
BEFORE UPDATE ON public.ad_creatives
FOR EACH ROW
EXECUTE FUNCTION update_last_activated_timestamp();

-- Backfill existing data: set instagram_url_updated_at for existing Instagram URLs
UPDATE public.ad_creatives
SET instagram_url_updated_at = updated_at
WHERE merged_instagram_reel_url IS NOT NULL 
  AND instagram_url_updated_at IS NULL;

-- Backfill existing data: set tiktok_url_updated_at for existing TikTok codes
UPDATE public.ad_creatives
SET tiktok_url_updated_at = updated_at
WHERE merged_tiktok_auth_code IS NOT NULL 
  AND tiktok_url_updated_at IS NULL;

-- Backfill existing data: set last_activated_at for currently active creatives
UPDATE public.ad_creatives
SET last_activated_at = updated_at
WHERE status = 'active' 
  AND last_activated_at IS NULL;

COMMENT ON COLUMN public.ad_creatives.instagram_url_updated_at IS 'Timestamp when the Instagram URL was last updated';
COMMENT ON COLUMN public.ad_creatives.tiktok_url_updated_at IS 'Timestamp when the TikTok auth code was last updated';
COMMENT ON COLUMN public.ad_creatives.last_activated_at IS 'Timestamp when the ad creative was last set to active status';
