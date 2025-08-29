/*
  # Fix Notes-Only Submission for Videos
  
  1. Changes
    - Update the messages table to properly handle notes-only submissions
    - Add a trigger to update the submission status when a message is added
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create a function to update submission status when a message is added
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

-- Create a trigger to automatically update submission status
DROP TRIGGER IF EXISTS update_status_on_message ON public.messages;
CREATE TRIGGER update_status_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_submission_status_on_message();

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at on submissions
DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;
CREATE TRIGGER update_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';