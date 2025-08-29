/*
  # Fix ad_creatives table structure

  1. Changes
    - Drop and recreate ad_creatives table with proper structure
    - Add rejection_reason column
    - Update status check constraint to include 'rejected' status
    - Recreate all indexes and policies

  2. Security
    - Maintain existing RLS policies
    - Grant necessary permissions
*/

-- Drop existing table
DROP TABLE IF EXISTS public.ad_creatives CASCADE;

-- Create table with updated structure
CREATE TABLE public.ad_creatives (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  artists_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'archived', 'rejected')) DEFAULT 'pending',
  rejection_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_ad_creatives_artists_id ON public.ad_creatives(artists_id);
CREATE INDEX idx_ad_creatives_platform ON public.ad_creatives(platform);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);
CREATE INDEX idx_ad_creatives_created_at ON public.ad_creatives(created_at);

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

-- Create trigger to update updated_at
CREATE TRIGGER update_ad_creatives_updated_at
  BEFORE UPDATE ON public.ad_creatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';