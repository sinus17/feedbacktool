/*
  # Fix Artist Notes-Only Submission
  
  1. Changes
    - Ensure messages can be sent without requiring a video URL update
    - Improve handling of notes-only submissions from artists
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update the update_submission_status_on_message function to handle notes-only submissions
CREATE OR REPLACE FUNCTION update_submission_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the submission status based on who sent the message
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