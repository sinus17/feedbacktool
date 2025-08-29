/*
  # Update WhatsApp Notification Logic
  
  1. Changes
    - Modify notification logic to send messages to the correct groups
    - When admin sends feedback, only notify artist's WhatsApp group
    - When artist updates video or sends notes, only notify internal team group
    - When admin sets ad creative to active, only notify artist's WhatsApp group
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to handle WhatsApp notifications for admin feedback
CREATE OR REPLACE FUNCTION handle_admin_feedback_notification()
RETURNS TRIGGER AS $$
DECLARE
  submission_record RECORD;
  artist_record RECORD;
  artist_group_id TEXT;
BEGIN
  -- Only proceed if this is an admin message
  IF NOT NEW.is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Get submission and artist information
  SELECT * INTO submission_record FROM submissions WHERE id = NEW.submission_id;
  SELECT * INTO artist_record FROM artists WHERE id = submission_record.artist_id;
  
  -- Format the group ID
  artist_group_id := CASE 
    WHEN artist_record.whatsapp_group_id IS NULL THEN NULL
    ELSE regexp_replace(artist_record.whatsapp_group_id, '[^0-9]', '', 'g')
  END;
  
  -- Log the notification attempt
  INSERT INTO public.whatsapp_logs (
    type,
    status,
    message,
    metadata
  ) VALUES (
    'feedback',
    'info',
    'Admin feedback notification triggered',
    jsonb_build_object(
      'message_id', NEW.id,
      'submission_id', NEW.submission_id,
      'is_admin', NEW.is_admin,
      'artist_id', artist_record.id,
      'artist_name', artist_record.name,
      'artist_group_id', artist_group_id,
      'project_name', submission_record.project_name,
      'notification_target', 'artist_only'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle WhatsApp notifications for artist updates
CREATE OR REPLACE FUNCTION handle_artist_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  submission_record RECORD;
  artist_record RECORD;
  team_group_id TEXT;
BEGIN
  -- Only proceed if this is an artist message
  IF NEW.is_admin THEN
    RETURN NEW;
  END IF;
  
  -- Get submission and artist information
  SELECT * INTO submission_record FROM submissions WHERE id = NEW.submission_id;
  SELECT * INTO artist_record FROM artists WHERE id = submission_record.artist_id;
  
  -- Get team group ID from environment variable
  -- In a real environment, this would be stored in a settings table
  team_group_id := '120363291976373833';
  
  -- Log the notification attempt
  INSERT INTO public.whatsapp_logs (
    type,
    status,
    message,
    metadata
  ) VALUES (
    'feedback',
    'info',
    'Artist update notification triggered',
    jsonb_build_object(
      'message_id', NEW.id,
      'submission_id', NEW.submission_id,
      'is_admin', NEW.is_admin,
      'artist_id', artist_record.id,
      'artist_name', artist_record.name,
      'team_group_id', team_group_id,
      'project_name', submission_record.project_name,
      'notification_target', 'team_only'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle WhatsApp notifications for ad creative status changes
CREATE OR REPLACE FUNCTION handle_ad_creative_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  artist_record RECORD;
  artist_group_id TEXT;
BEGIN
  -- Only proceed if status changed to active
  IF NEW.status != 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Get artist information
  SELECT * INTO artist_record FROM artists WHERE id = NEW.artists_id;
  
  -- Format the group ID
  artist_group_id := CASE 
    WHEN artist_record.whatsapp_group_id IS NULL THEN NULL
    ELSE regexp_replace(artist_record.whatsapp_group_id, '[^0-9]', '', 'g')
  END;
  
  -- Log the notification attempt
  INSERT INTO public.whatsapp_logs (
    type,
    status,
    message,
    metadata
  ) VALUES (
    'ad_creative_submission',
    'info',
    'Ad creative status notification triggered',
    jsonb_build_object(
      'creative_id', NEW.id,
      'artist_id', NEW.artists_id,
      'artist_name', artist_record.name,
      'artist_group_id', artist_group_id,
      'platform', NEW.platform,
      'content', NEW.content,
      'video_name', NEW.video_name,
      'status', NEW.status,
      'notification_target', 'artist_only'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace triggers for the notification functions
DROP TRIGGER IF EXISTS handle_admin_feedback_notification_trigger ON public.messages;
CREATE TRIGGER handle_admin_feedback_notification_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.is_admin = true)
EXECUTE FUNCTION handle_admin_feedback_notification();

DROP TRIGGER IF EXISTS handle_artist_update_notification_trigger ON public.messages;
CREATE TRIGGER handle_artist_update_notification_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.is_admin = false)
EXECUTE FUNCTION handle_artist_update_notification();

DROP TRIGGER IF EXISTS handle_ad_creative_status_notification_trigger ON public.ad_creatives;
CREATE TRIGGER handle_ad_creative_status_notification_trigger
AFTER UPDATE OF status ON public.ad_creatives
FOR EACH ROW
WHEN (NEW.status = 'active' AND OLD.status != 'active')
EXECUTE FUNCTION handle_ad_creative_status_notification();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';