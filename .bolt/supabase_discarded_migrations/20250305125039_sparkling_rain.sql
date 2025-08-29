/*
  # Add planned status to submissions
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Allows videos to be marked as planned for future content calendar dates
  
  2. Security
    - Maintains existing RLS policies
    - No changes to access controls needed
  
  3. Notes
    - Safe migration that preserves existing data
    - Only modifies the constraint to allow new status value
*/

-- First drop the existing constraint
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Then add the new constraint with the additional status
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_status_check 
CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));