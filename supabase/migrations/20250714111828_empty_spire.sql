/*
  # Add thumbnail_url to ad_creatives table

  1. New Columns
    - `thumbnail_url` (text, nullable) - URL to a thumbnail image for video content
  
  2. Changes
    - Adds a new column to store thumbnail URLs for video content
*/

-- Add thumbnail_url column to ad_creatives table
ALTER TABLE public.ad_creatives
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Enable RLS on ad_creatives table (in case it's not already enabled)
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;