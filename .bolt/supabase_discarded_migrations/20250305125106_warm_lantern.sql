/*
  # Add planned status to submissions
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Update existing content plan posts to handle planned vs posted status
  
  2. Data Migration
    - Updates existing submissions to use correct status based on content plan dates
    - Ensures no constraint violations during migration
  
  3. Security
    - Maintains existing RLS policies
    - No changes to access controls needed
  
  4. Notes
    - Safe migration that preserves existing data
    - Updates existing content plan posts to use correct status
*/

-- First temporarily disable the constraint
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS submissions_status_check;

-- Update existing submissions based on content plan dates
DO $$ 
DECLARE
    submission_record RECORD;
BEGIN
    -- Update submissions with content plan posts
    FOR submission_record IN 
        SELECT 
            s.id as submission_id,
            cpp.scheduled_date
        FROM submissions s
        JOIN content_plan_posts cpp ON cpp.submission_id = s.id
    LOOP
        -- Update status based on scheduled date
        UPDATE submissions 
        SET status = CASE 
            WHEN submission_record.scheduled_date < NOW() THEN 'posted'
            ELSE 'planned'
        END,
        updated_at = NOW()
        WHERE id = submission_record.submission_id;
    END LOOP;
END $$;

-- Add the new constraint with additional status
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_status_check 
CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));