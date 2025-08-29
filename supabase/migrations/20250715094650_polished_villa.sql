/*
  # Add thumbnail URL columns for Instagram and TikTok

  1. Changes
    - Add `instagram_thumbnail_url` column to `ad_creatives` table
    - Add `tiktok_thumbnail_url` column to `ad_creatives` table
*/

-- Add Instagram thumbnail URL column
ALTER TABLE public.ad_creatives 
ADD COLUMN instagram_thumbnail_url TEXT DEFAULT NULL;

-- Add TikTok thumbnail URL column
ALTER TABLE public.ad_creatives 
ADD COLUMN tiktok_thumbnail_url TEXT DEFAULT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_thumbnail_url 
ON public.ad_creatives(instagram_thumbnail_url);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_thumbnail_url 
ON public.ad_creatives(tiktok_thumbnail_url);