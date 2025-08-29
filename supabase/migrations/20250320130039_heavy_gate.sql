/*
  # Update submissions status constraint

  1. Changes
    - Add 'archived' status to submissions table status check constraint
    - Preserve existing statuses
  
  2. Notes
    - Safe migration that maintains data integrity
    - Allows archiving functionality to work properly
*/

-- Update the status check constraint for submissions table
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check 
  CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted', 'archived'));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';