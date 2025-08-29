/*
  # Add Instagram and TikTok thumbnail URL columns
  
  1. New Columns
    - `instagram_thumbnail_url` (text, nullable) - Stores thumbnail URLs for Instagram content
    - `tiktok_thumbnail_url` (text, nullable) - Stores thumbnail URLs for TikTok content
  
  2. Indexes
    - Added indexes for both new columns to improve query performance
*/

-- Add Instagram thumbnail URL column
ALTER TABLE public.ad_creatives 
ADD COLUMN IF NOT EXISTS instagram_thumbnail_url TEXT DEFAULT NULL;

-- Add TikTok thumbnail URL column
ALTER TABLE public.ad_creatives 
ADD COLUMN IF NOT EXISTS tiktok_thumbnail_url TEXT DEFAULT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_thumbnail_url 
ON public.ad_creatives (instagram_thumbnail_url);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_thumbnail_url 
ON public.ad_creatives (tiktok_thumbnail_url);