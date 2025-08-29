/*
  # Add planned status to submissions table
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Safely handle existing data before modifying constraints
  
  2. Data Migration Steps
    - Create temporary column for new status
    - Update existing data
    - Apply new constraint
    - Clean up temporary column
  
  3. Security
    - Maintains existing RLS policies
    - No changes to access controls
*/

-- Create a temporary column for the new status
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS temp_status TEXT;

-- Copy existing status to temporary column
UPDATE submissions 
SET temp_status = status;

-- Drop the existing constraint
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Add the new constraint with all valid statuses
ALTER TABLE submissions
ADD CONSTRAINT submissions_status_check 
CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));

-- Update content plan posts based on scheduled date
UPDATE submissions s
SET status = 
  CASE 
    WHEN cpp.scheduled_date < NOW() THEN 'posted'
    ELSE 'planned'
  END
FROM content_plan_posts cpp
WHERE cpp.submission_id = s.id
  AND s.status = 'posted';

-- Drop the temporary column
ALTER TABLE submissions 
DROP COLUMN IF EXISTS temp_status;