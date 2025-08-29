/*
  # Add notes field to content plan posts

  1. Schema Changes
    - Add `notes` column to `content_plan_posts` table
    - Column allows text content for additional information about scheduled posts
    - Column is nullable to maintain backward compatibility

  2. Security
    - No changes to existing RLS policies needed
    - Notes field inherits existing security model
*/

-- Add notes column to content_plan_posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_plan_posts' AND column_name = 'notes'
  ) THEN
    ALTER TABLE content_plan_posts ADD COLUMN notes TEXT;
  END IF;
END $$;