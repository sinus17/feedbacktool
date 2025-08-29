/*
  # Add merged columns to ad_creatives table
  
  1. Changes
    - Add `merged_instagram_reel_url` column to store merged Instagram reel URLs
    - Add `merged_tiktok_auth_code` column to store merged TikTok auth codes
    - Both columns are optional (nullable) to maintain compatibility with existing data
  
  2. Security
    - No changes to RLS policies needed - existing policies cover the new columns
*/

-- Add merged_instagram_reel_url column
ALTER TABLE public.ad_creatives
  ADD COLUMN merged_instagram_reel_url text;

-- Add merged_tiktok_auth_code column  
ALTER TABLE public.ad_creatives
  ADD COLUMN merged_tiktok_auth_code text;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';