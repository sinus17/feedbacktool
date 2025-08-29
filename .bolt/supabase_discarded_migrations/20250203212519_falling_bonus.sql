/*
  # Add Audiences Feature

  1. New Tables
    - `audiences`
      - `id` (text, primary key)
      - `created_at` (timestamp)
      - `artist_id` (text, references artists)
      - `name` (text)
      - `description` (text)
      - `instagram_urls` (text array)
      - `status` (text)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `audiences` table
    - Add policies for public access
*/

-- Create audiences table
CREATE TABLE public.audiences (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instagram_urls TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_audiences_artist_id ON public.audiences(artist_id);
CREATE INDEX idx_audiences_status ON public.audiences(status);
CREATE INDEX idx_audiences_created_at ON public.audiences(created_at);

-- Enable RLS
ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to audiences"
  ON public.audiences FOR SELECT
  USING (true);

CREATE POLICY "Public write access to audiences"
  ON public.audiences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to audiences"
  ON public.audiences FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to audiences"
  ON public.audiences FOR DELETE
  USING (true);

-- Grant permissions
GRANT ALL ON public.audiences TO anon;
GRANT ALL ON public.audiences TO authenticated;

-- Create trigger to update updated_at
CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON public.audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';