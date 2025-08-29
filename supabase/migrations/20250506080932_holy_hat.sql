/*
  # Add updated_at column to messages table

  1. Changes
    - Add `updated_at` column to `messages` table with default value and NOT NULL constraint
    - Add trigger to automatically update `updated_at` on record changes

  2. Technical Details
    - Column type: TIMESTAMP WITH TIME ZONE
    - Default value: Current timestamp in UTC
    - Trigger: Updates timestamp whenever record is modified
*/

-- Add updated_at column
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();