/*
  # Fix WhatsApp notification for ad creative updates
  
  1. Changes
    - Update the log_whatsapp_notification_attempt function to handle null video_name
    - Ensure proper notification is sent when Instagram URL or TikTok code is merged
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the function to handle null video_name
CREATE OR REPLACE FUNCTION log_whatsapp_notification_attempt()
RETURNS TRIGGER AS $$
DECLARE
  artist_name text;
  artist_group_id text;
  formatted_group_id text;
  video_name_value text;
BEGIN
  -- Get artist information
  SELECT a.name, a.whatsapp_group_id INTO artist_name, artist_group_id
  FROM artists a
  WHERE a.id = NEW.artists_id;
  
  -- Format the group ID
  formatted_group_id := CASE 
    WHEN artist_group_id IS NULL THEN NULL
    ELSE regexp_replace(artist_group_id, '[^0-9]', '', 'g')
  END;
  
  -- Get video name with fallback
  video_name_value := COALESCE(NEW.video_name, 'Untitled Video');
  
  -- Log the notification attempt with more details
  INSERT INTO public.whatsapp_logs (
    type,
    status,
    message,
    metadata
  ) VALUES (
    'ad_creative_submission',
    'success',
    'Notification logged for ad creative update via trigger',
    jsonb_build_object(
      'creative_id', NEW.id,
      'artist_id', NEW.artists_id,
      'artist_name', artist_name,
      'artist_group_id', artist_group_id,
      'formatted_group_id', formatted_group_id,
      'platform', NEW.platform,
      'content', NEW.content,
      'video_name', video_name_value,
      'status', NEW.status,
      'timestamp', now(),
      'is_merge', CASE 
        WHEN (OLD.merged_instagram_reel_url IS NULL AND NEW.merged_instagram_reel_url IS NOT NULL) OR
             (OLD.merged_tiktok_auth_code IS NULL AND NEW.merged_tiktok_auth_code IS NOT NULL) OR
             (OLD.merged_instagram_reel_url IS NOT NULL AND NEW.merged_instagram_reel_url IS NOT NULL AND 
              OLD.merged_instagram_reel_url != NEW.merged_instagram_reel_url) OR
             (OLD.merged_tiktok_auth_code IS NOT NULL AND NEW.merged_tiktok_auth_code IS NOT NULL AND
              OLD.merged_tiktok_auth_code != NEW.merged_tiktok_auth_code)
        THEN true
        ELSE false
      END,
      'merged_instagram_reel_url', NEW.merged_instagram_reel_url,
      'merged_tiktok_auth_code', NEW.merged_tiktok_auth_code,
      'previous_instagram_reel_url', OLD.merged_instagram_reel_url,
      'previous_tiktok_auth_code', OLD.merged_tiktok_auth_code
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS log_ad_creative_notification ON public.ad_creatives;
CREATE TRIGGER log_ad_creative_notification
AFTER UPDATE ON public.ad_creatives
FOR EACH ROW
WHEN (
  (OLD.merged_instagram_reel_url IS NULL AND NEW.merged_instagram_reel_url IS NOT NULL) OR
  (OLD.merged_tiktok_auth_code IS NULL AND NEW.merged_tiktok_auth_code IS NOT NULL) OR
  (OLD.merged_instagram_reel_url IS NOT NULL AND NEW.merged_instagram_reel_url IS NOT NULL AND 
   OLD.merged_instagram_reel_url != NEW.merged_instagram_reel_url) OR
  (OLD.merged_tiktok_auth_code IS NOT NULL AND NEW.merged_tiktok_auth_code IS NOT NULL AND
   OLD.merged_tiktok_auth_code != NEW.merged_tiktok_auth_code)
)
EXECUTE FUNCTION log_whatsapp_notification_attempt();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';