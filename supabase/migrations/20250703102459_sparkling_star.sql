/*
  # Add archived column to artists table
  
  1. Changes
    - Add archived column to artists table with default value of false
    - This allows artists to be archived instead of deleted
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add archived column to artists table if it doesn't exist
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_artists_archived ON public.artists(archived);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';