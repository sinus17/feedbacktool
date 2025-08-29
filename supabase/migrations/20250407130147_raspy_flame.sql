/*
  # Add notes field to submissions table
  
  1. Changes
    - Add notes column to submissions table for storing submission comments
    - Column is optional (nullable) to maintain compatibility with existing data
  
  2. Security
    - No changes to RLS policies needed - existing policies cover the new column
*/

-- Add notes column to submissions table
ALTER TABLE public.submissions
  ADD COLUMN notes text;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';