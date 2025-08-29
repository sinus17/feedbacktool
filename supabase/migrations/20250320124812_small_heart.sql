/*
  # Add Dropbox platform to ad_creatives table
  
  1. Changes
    - Add 'dropbox' to platform check constraint in ad_creatives table
    - Maintain existing data and constraints
  
  2. Security
    - No changes to RLS policies needed
*/

-- Update platform check constraint
ALTER TABLE public.ad_creatives 
  DROP CONSTRAINT IF EXISTS ad_creatives_platform_check;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_platform_check 
  CHECK (platform IN ('instagram', 'tiktok', 'dropbox'));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';