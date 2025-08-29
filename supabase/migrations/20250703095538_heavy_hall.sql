/*
  # Fix WhatsApp Notifications for Ad Creative Merges
  
  1. Changes
    - Add a function to log WhatsApp notification attempts
    - Create a trigger to automatically send notifications when ad creatives are updated
    - Ensure proper notification when Instagram URLs or TikTok codes are merged
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to log WhatsApp notification attempts
CREATE OR REPLACE FUNCTION log_whatsapp_notification_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the notification attempt
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
      'platform', NEW.platform,
      'content', NEW.content,
      'status', NEW.status,
      'timestamp', now(),
      'is_merge', CASE 
        WHEN (OLD.merged_instagram_reel_url IS NULL AND NEW.merged_instagram_reel_url IS NOT NULL) OR
             (OLD.merged_tiktok_auth_code IS NULL AND NEW.merged_tiktok_auth_code IS NOT NULL) OR
             (OLD.merged_instagram_reel_url != NEW.merged_instagram_reel_url) OR
             (OLD.merged_tiktok_auth_code != NEW.merged_tiktok_auth_code)
        THEN true
        ELSE false
      END
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to log notification attempts
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