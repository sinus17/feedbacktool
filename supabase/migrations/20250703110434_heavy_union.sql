/*
  # Add submission_id to ad_creatives table
  
  1. New Columns
    - `submission_id` (text): References the original submission ID that this ad creative was created from
  
  2. Foreign Keys
    - Add foreign key constraint to link ad_creatives to submissions
    - ON DELETE CASCADE to ensure ad creatives are deleted when the submission is deleted
  
  3. Purpose
    - Maintain link between submissions and ad creatives
    - Allow video URL updates in submissions to propagate to ad creatives
    - Enable better tracking of content across the platform
*/

-- Add submission_id column to ad_creatives table
ALTER TABLE public.ad_creatives
  ADD COLUMN submission_id text;

-- Add foreign key constraint
ALTER TABLE public.ad_creatives
  ADD CONSTRAINT content_plan_posts_submission_id_fkey
  FOREIGN KEY (submission_id)
  REFERENCES submissions(id)
  ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_ad_creatives_submission_id ON public.ad_creatives(submission_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';