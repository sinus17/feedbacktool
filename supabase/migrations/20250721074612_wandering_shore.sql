/*
  # Add language column to ad_creatives table

  1. New Columns
    - `language` (text, nullable) - Stores the language/locale for the ad creative content
  
  2. Changes
    - Adds a new column to store language information for ad creatives
    - Useful for targeting specific markets or regions
*/

-- Add language column to ad_creatives table
ALTER TABLE public.ad_creatives
ADD COLUMN IF NOT EXISTS language text;

-- Create index for the new column for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ad_creatives_language ON public.ad_creatives USING btree (language);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';