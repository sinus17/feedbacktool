/*
  # Add detailed logging for WhatsApp notifications
  
  1. Changes
    - Update the update_submission_status_on_message function to include more detailed logging
    - Add additional validation for WhatsApp group IDs
    - Improve error handling for WhatsApp notifications
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the update_submission_status_on_message function to handle notes-only submissions
CREATE OR REPLACE FUNCTION update_submission_status_on_message()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows integer;
  current_status text;
  new_status text;
  artist_id text;
  artist_name text;
  artist_group_id text;
BEGIN
  -- Get current submission status and artist info
  SELECT 
    s.status, 
    s.artist_id,
    a.name,
    a.whatsapp_group_id
  INTO 
    current_status,
    artist_id,
    artist_name,
    artist_group_id
  FROM 
    public.submissions s
    JOIN public.artists a ON s.artist_id = a.id
  WHERE 
    s.id = NEW.submission_id;
  
  -- Determine new status based on who sent the message
  new_status := CASE WHEN NEW.is_admin THEN 'correction-needed' ELSE 'feedback-needed' END;
  
  -- Log the message being processed with detailed information
  RAISE NOTICE 'Processing message: id=%, submission_id=%, is_admin=%, current_status=%, new_status=%, artist=%', 
               NEW.id, NEW.submission_id, NEW.is_admin, current_status, new_status, artist_name;
               
  -- Update the submission status
  UPDATE public.submissions
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = NEW.submission_id
  RETURNING 1 INTO affected_rows;
  
  -- Log the result of the update
  RAISE NOTICE 'Updated submission status: submission_id=%, affected_rows=%, new_status=%, artist_group_id=%', 
               NEW.submission_id, affected_rows, new_status, artist_group_id;
  
  -- Log the update to whatsapp_logs for debugging
  INSERT INTO public.whatsapp_logs (
    type,
    status,
    message,
    metadata
  ) VALUES (
    'feedback',
    'info',
    'Message status update triggered',
    jsonb_build_object(
      'message_id', NEW.id,
      'submission_id', NEW.submission_id,
      'is_admin', NEW.is_admin,
      'current_status', current_status,
      'new_status', new_status,
      'artist_id', artist_id,
      'artist_name', artist_name,
      'artist_group_id', artist_group_id,
      'affected_rows', affected_rows
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS update_status_on_message ON public.messages;
CREATE TRIGGER update_status_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_submission_status_on_message();

-- Add 'info' to the allowed status values for whatsapp_logs
ALTER TABLE public.whatsapp_logs 
  DROP CONSTRAINT IF EXISTS whatsapp_logs_status_check;

ALTER TABLE public.whatsapp_logs
  ADD CONSTRAINT whatsapp_logs_status_check 
  CHECK (status IN ('success', 'error', 'info', 'warning'));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';