/*
  # Fix instant status update for artist feedback
  
  1. Changes
    - Enhance the update_submission_status_on_message function with better logging
    - Ensure the status update happens reliably for notes-only submissions
    - Add detailed logging to help diagnose any future issues
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the update_submission_status_on_message function to handle notes-only submissions
CREATE OR REPLACE FUNCTION update_submission_status_on_message()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows integer;
  current_status text;
BEGIN
  -- Get current submission status
  SELECT status INTO current_status
  FROM public.submissions
  WHERE id = NEW.submission_id;
  
  -- Log the message being processed with detailed information
  RAISE NOTICE 'Processing message: id=%, submission_id=%, is_admin=%, text=%, current_status=%', 
               NEW.id, NEW.submission_id, NEW.is_admin, NEW.text, current_status;
               
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
  WHERE id = NEW.submission_id
  RETURNING 1 INTO affected_rows;
  
  -- Log the result of the update
  RAISE NOTICE 'Updated submission status: submission_id=%, affected_rows=%, new_status=%', 
               NEW.submission_id, affected_rows, 
               CASE WHEN NEW.is_admin THEN 'correction-needed' ELSE 'feedback-needed' END;
  
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