/*
  # Add planned status to submissions table
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Safely handle existing data before modifying constraints
  
  2. Data Migration Steps
    - Update any invalid status values to 'new'
    - Drop existing constraint
    - Add new constraint with expanded status options
    - Update content plan posts with appropriate status
  
  3. Security
    - Maintains existing RLS policies
    - No changes to access controls
*/

-- First ensure all existing statuses are valid
UPDATE submissions 
SET status = 'new'
WHERE status NOT IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'posted');

-- Drop the existing constraint
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Add the new constraint with expanded status options
ALTER TABLE submissions
ADD CONSTRAINT submissions_status_check 
CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));

-- Update existing content plan posts to use appropriate status based on scheduled date
UPDATE submissions s
SET status = 
  CASE 
    WHEN cpp.scheduled_date > NOW() THEN 'planned'
    ELSE 'posted'
  END
FROM content_plan_posts cpp
WHERE cpp.submission_id = s.id
  AND s.status = 'posted';