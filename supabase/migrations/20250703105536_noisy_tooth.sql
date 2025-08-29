/*
  # Fix submissions status constraint

  1. Changes
    - Update submissions_status_check constraint to include 'planned' and 'archived' statuses
    - These statuses are used in the application but were missing from the database constraint

  2. Security
    - No changes to RLS policies
*/

-- Drop the existing constraint
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Add the updated constraint with all required statuses
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check 
  CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted', 'archived'));