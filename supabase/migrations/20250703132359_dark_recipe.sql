/*
  # Improve status update for artist feedback
  
  1. Changes
    - Enhance the update_submission_status_on_message function to provide better logging
    - Ensure status is properly updated when artist submits notes-only feedback
    - Maintain existing trigger behavior
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the update_submission_status_on_message function to handle notes-only submissions
CREATE OR REPLACE FUNCTION update_submission_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the message being processed for debugging
  RAISE NOTICE 'Processing message: id=%, submission_id=%, is_admin=%, text=%', 
               NEW.id, NEW.submission_id, NEW.is_admin, NEW.text;
               
  -- Update the submission status based on who sent the message
  -- For artist messages (is_admin = false), set status to 'feedback-needed'
  -- For admin messages (is_admin = true), set status to 'correction-needed'
  UPDATE public.submissions
  SET 
    status = CASE 
      WHEN NEW.is_admin THEN 'correction-needed'
      ELSE 'feedback-needed'
    END,
    updated_at = NOW()
  WHERE id = NEW.submission_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS update_status_on_message ON public.messages;
CREATE TRIGGER update_status_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_submission_status_on_message();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';