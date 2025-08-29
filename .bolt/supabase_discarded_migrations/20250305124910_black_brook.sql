/*
  # Add planned status and update content plan logic
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Update existing content plan posts to handle planned vs posted status
  
  2. Notes
    - Existing posts will maintain their current status
    - New posts will use planned/posted based on scheduled date
*/

DO $$ BEGIN
  -- Update the status check constraint for submissions table
  ALTER TABLE submissions 
    DROP CONSTRAINT IF EXISTS submissions_status_check;
  
  ALTER TABLE submissions
    ADD CONSTRAINT submissions_status_check 
    CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));

END $$;