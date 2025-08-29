/*
  # Remove Song Saylor 1 entry from content plan
  
  1. Changes
    - Delete the specific content plan post for "Song Saylor 1"
    - Maintain data integrity by not affecting other content plan posts
  
  2. Security
    - No changes to RLS policies needed
    - Uses a safe approach to target only the specific entry
*/

-- Delete the specific content plan post for "Song Saylor 1"
DELETE FROM public.content_plan_posts
WHERE submission_id IN (
  SELECT id FROM public.submissions
  WHERE project_name = 'Song Saylor 1'
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';