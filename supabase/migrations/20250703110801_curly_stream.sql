/*
  # Fix ad creative deletion to preserve parent submission
  
  1. Changes
    - Modify the foreign key constraint for ad_creatives.submission_id to use SET NULL on delete
    - This ensures that when an ad creative is deleted, the parent submission is preserved
  
  2. Security
    - No changes to RLS policies needed
*/

-- Drop the existing constraint
ALTER TABLE public.ad_creatives
  DROP CONSTRAINT IF EXISTS content_plan_posts_submission_id_fkey;

-- Add the modified foreign key constraint with SET NULL on delete
ALTER TABLE public.ad_creatives
  ADD CONSTRAINT content_plan_posts_submission_id_fkey
  FOREIGN KEY (submission_id)
  REFERENCES submissions(id)
  ON DELETE SET NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';