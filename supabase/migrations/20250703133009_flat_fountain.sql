/*
  # Enhance status update trigger for artist feedback
  
  1. Changes
    - Improve the update_submission_status_on_message function with better logging
    - Ensure status updates happen reliably for notes-only submissions
    - Add detailed logging to help diagnose any issues
  
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
BEGIN
  -- Get current submission status
  SELECT status INTO current_status
  FROM public.submissions
  WHERE id = NEW.submission_id;
  
  -- Determine new status based on who sent the message
  new_status := CASE WHEN NEW.is_admin THEN 'correction-needed' ELSE 'feedback-needed' END;
  
  -- Log the message being processed with detailed information
  RAISE NOTICE 'Processing message: id=%, submission_id=%, is_admin=%, current_status=%, new_status=%', 
               NEW.id, NEW.submission_id, NEW.is_admin, current_status, new_status;
               
  -- Update the submission status
  UPDATE public.submissions
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = NEW.submission_id
  RETURNING 1 INTO affected_rows;
  
  -- Log the result of the update
  RAISE NOTICE 'Updated submission status: submission_id=%, affected_rows=%, new_status=%', 
               NEW.submission_id, affected_rows, new_status;
  
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