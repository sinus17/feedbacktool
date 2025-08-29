-- Drop and recreate ad_creatives table with correct column name
DROP TABLE IF EXISTS public.ad_creatives CASCADE;

CREATE TABLE public.ad_creatives (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  artists_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending'
);

-- Create indexes
CREATE INDEX idx_ad_creatives_artists_id ON public.ad_creatives(artists_id);
CREATE INDEX idx_ad_creatives_platform ON public.ad_creatives(platform);
CREATE INDEX idx_ad_creatives_status ON public.ad_creatives(status);

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