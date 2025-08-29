/*
  # Add Instagram and TikTok thumbnail columns

  1. New Columns
    - `instagram_thumbnail_url` (text, nullable) - Stores the URL of the Instagram post thumbnail
    - `tiktok_thumbnail_url` (text, nullable) - Stores the URL of the TikTok post thumbnail
  
  2. Indexes
    - Added indexes for both thumbnail URL columns to improve query performance
*/

-- Add thumbnail URL columns to ad_creatives table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_creatives' AND column_name = 'instagram_thumbnail_url'
  ) THEN
    ALTER TABLE public.ad_creatives ADD COLUMN instagram_thumbnail_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_creatives' AND column_name = 'tiktok_thumbnail_url'
  ) THEN
    ALTER TABLE public.ad_creatives ADD COLUMN tiktok_thumbnail_url text;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_thumbnail_url ON public.ad_creatives USING btree (instagram_thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_thumbnail_url ON public.ad_creatives USING btree (tiktok_thumbnail_url);