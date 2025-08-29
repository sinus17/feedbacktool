/*
  # Add video name tracking to ad creatives
  
  1. Changes
    - Add video_name column to ad_creatives table to store original submission name
    - Column is optional to maintain compatibility with existing data
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add video_name column to ad_creatives table
ALTER TABLE public.ad_creatives
  ADD COLUMN video_name text;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';