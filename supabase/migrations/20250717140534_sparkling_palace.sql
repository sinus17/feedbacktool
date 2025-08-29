/*
  # Add Instagram and TikTok thumbnail columns
  
  1. New Columns
     - `instagram_thumbnail_url` (text, nullable) - Stores the URL of the Instagram post thumbnail
     - `tiktok_thumbnail_url` (text, nullable) - Stores the URL of the TikTok post thumbnail
     
  2. Indexes
     - Added indexes for efficient querying by thumbnail URLs
*/

-- Add thumbnail columns to ad_creatives table
ALTER TABLE public.ad_creatives 
ADD COLUMN IF NOT EXISTS instagram_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_thumbnail_url TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ad_creatives_instagram_thumbnail_url ON public.ad_creatives USING btree (instagram_thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_tiktok_thumbnail_url ON public.ad_creatives USING btree (tiktok_thumbnail_url);