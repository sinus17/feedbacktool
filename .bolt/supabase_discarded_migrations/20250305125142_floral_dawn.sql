/*
  # Add planned status to submissions
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Update existing content plan posts to handle planned vs posted status
  
  2. Data Migration
    - Safely updates existing data before modifying constraints
    - Handles all edge cases to prevent constraint violations
  
  3. Security
    - Maintains existing RLS policies
    - No changes to access controls needed
  
  4. Notes
    - Safe migration that preserves existing data
    - Updates existing content plan posts to use correct status
*/

-- First create a temporary status check constraint that allows both old and new values
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE public.submissions
ADD CONSTRAINT submissions_status_check_temp 
CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'posted'));

-- Update submissions that are in content plan posts
DO $$ 
BEGIN
    -- First, handle submissions with content plan posts
    UPDATE submissions s
    SET 
        status = CASE 
            WHEN cpp.scheduled_date < NOW() THEN 'posted'
            ELSE 'ready' -- Temporarily set to 'ready' for those in the future
        END,
        updated_at = NOW()
    FROM content_plan_posts cpp
    WHERE cpp.submission_id = s.id;

    -- Now we can safely drop the temporary constraint
    ALTER TABLE public.submissions 
    DROP CONSTRAINT IF EXISTS submissions_status_check_temp;

    -- Add the final constraint with all statuses including 'planned'
    ALTER TABLE public.submissions
    ADD CONSTRAINT submissions_status_check 
    CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));

    -- Finally, update future-dated posts to 'planned'
    UPDATE submissions s
    SET 
        status = 'planned',
        updated_at = NOW()
    FROM content_plan_posts cpp
    WHERE cpp.submission_id = s.id
    AND cpp.scheduled_date > NOW();
END $$;