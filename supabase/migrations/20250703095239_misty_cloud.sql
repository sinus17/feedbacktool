/*
  # Add Instagram and TikTok URL display to ad_creatives
  
  1. Changes
    - Add indexes for merged_instagram_reel_url and merged_tiktok_auth_code columns
    - Ensure proper indexing for faster queries
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add indexes for merged URL columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_url ON public.ad_creatives(merged_instagram_reel_url);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_code ON public.ad_creatives(merged_tiktok_auth_code);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';