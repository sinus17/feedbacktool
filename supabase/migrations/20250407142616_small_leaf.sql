/*
  # Add function to handle initial notes display
  
  1. New Functions
    - Create a function to handle initial notes when a submission is created
    - Automatically create a message with the notes content when notes are provided
  
  2. Security
    - No changes to RLS policies needed
    - Function runs with the same permissions as the inserting user
*/

-- Create a function to handle initial notes
CREATE OR REPLACE FUNCTION handle_initial_notes()
RETURNS TRIGGER AS $$
BEGIN
  -- If notes are provided, create a message with the notes content
  IF NEW.notes IS NOT NULL AND LENGTH(TRIM(NEW.notes)) > 0 THEN
    INSERT INTO public.messages (
      submission_id,
      text,
      is_admin,
      created_at
    ) VALUES (
      NEW.id,
      'Initial notes: ' || NEW.notes,
      FALSE, -- Not from admin, from the artist
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically handle initial notes
DROP TRIGGER IF EXISTS handle_initial_notes_trigger ON public.submissions;
CREATE TRIGGER handle_initial_notes_trigger
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION handle_initial_notes();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';