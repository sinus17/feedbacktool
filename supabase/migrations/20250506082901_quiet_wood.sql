/*
  # Fix messages update trigger
  
  1. Changes
    - Update the messages_updated_at trigger to handle the updated_at column
    - Ensure the trigger is properly applied to the messages table
  
  2. Security
    - No changes to RLS policies needed
*/

-- Create or replace the function to update the updated_at column
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_messages_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';