/*
  # Update Ad Creatives Schema

  1. Changes
    - Rename column `artist_id` to `artists_id` in `ad_creatives` table
    - Update foreign key constraint
    - Update index name

  2. Security
    - Recreate RLS policies with updated column name
*/

-- Rename column and update foreign key
ALTER TABLE public.ad_creatives
  DROP CONSTRAINT IF EXISTS ad_creatives_artist_id_fkey;

ALTER TABLE public.ad_creatives
  RENAME COLUMN artist_id TO artists_id;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_artists_id_fkey
  FOREIGN KEY (artists_id)
  REFERENCES public.artists(id)
  ON DELETE CASCADE;

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_ad_creatives_artist_id;
CREATE INDEX idx_ad_creatives_artists_id ON public.ad_creatives(artists_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';