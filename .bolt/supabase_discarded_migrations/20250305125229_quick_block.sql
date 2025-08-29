/*
  # Add planned status to submissions
  
  1. Changes
    - Add 'planned' status to submissions table status check constraint
    - Safely handle existing data before modifying constraints
  
  2. Data Migration
    - Validates and updates existing data
    - Ensures no constraint violations
    - Handles all possible status values
  
  3. Security
    - Maintains existing RLS policies
    - No changes to access controls
  
  4. Notes
    - Safe migration that preserves data integrity
    - Handles edge cases and invalid states
*/

DO $$ 
BEGIN
    -- First ensure all existing statuses are valid
    UPDATE submissions
    SET status = 'new'
    WHERE status NOT IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'posted');

    -- Now we can safely modify the constraint
    ALTER TABLE submissions 
    DROP CONSTRAINT IF EXISTS submissions_status_check;

    -- Add the new constraint with all valid statuses
    ALTER TABLE submissions
    ADD CONSTRAINT submissions_status_check 
    CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'planned', 'posted'));

    -- Update submissions in content plan based on scheduled date
    UPDATE submissions s
    SET 
        status = CASE 
            WHEN cpp.scheduled_date < NOW() THEN 'posted'
            ELSE 'planned'
        END,
        updated_at = NOW()
    FROM content_plan_posts cpp
    WHERE cpp.submission_id = s.id;

    -- Log the migration
    INSERT INTO migrations_log (
        migration_name,
        executed_at,
        details
    ) VALUES (
        'add_planned_status',
        NOW(),
        jsonb_build_object(
            'description', 'Added planned status and updated content plan submissions',
            'executed_at', NOW()
        )
    );

EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO migrations_log (
        migration_name,
        executed_at,
        details,
        error
    ) VALUES (
        'add_planned_status',
        NOW(),
        jsonb_build_object(
            'description', 'Failed to add planned status',
            'executed_at', NOW()
        ),
        SQLERRM
    );
    RAISE;
END $$;