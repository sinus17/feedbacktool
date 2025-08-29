/*
  # Add Ad Creatives Schema

  1. New Tables
    - `ad_creatives`
      - `id` (text, primary key)
      - `created_at` (timestamp)
      - `artist_id` (text, foreign key)
      - `platform` (text, enum: instagram, tiktok)
      - `content` (text)
      - `status` (text, enum: pending, active, archived)

  2. Security
    - Enable RLS on `ad_creatives` table
    - Add policies for public access
*/

-- Create ad_creatives table
CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ad_creatives_artist_id ON public.ad_creatives(artist_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_platform ON public.ad_creatives(platform);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON public.ad_creatives(status);

-- Enable RLS
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to ad_creatives"
  ON public.ad_creatives FOR SELECT
  USING (true);

CREATE POLICY "Public write access to ad_creatives"
  ON public.ad_creatives FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to ad_creatives"
  ON public.ad_creatives FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to ad_creatives"
  ON public.ad_creatives FOR DELETE
  USING (true);

-- Grant permissions
GRANT ALL ON public.ad_creatives TO anon;
GRANT ALL ON public.ad_creatives TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';