-- Add missing campaign submission fields to releases table
ALTER TABLE public.releases 
  ADD COLUMN IF NOT EXISTS spotify_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS master_file_url TEXT,
  ADD COLUMN IF NOT EXISTS ad_budget INTEGER,
  ADD COLUMN IF NOT EXISTS service_package TEXT CHECK (service_package IN ('basic', 'full')),
  ADD COLUMN IF NOT EXISTS total_budget INTEGER,
  ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('artist', 'manager')),
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN public.releases.spotify_url IS 'Spotify track URL for published releases';
COMMENT ON COLUMN public.releases.cover_url IS 'Cover artwork URL';
COMMENT ON COLUMN public.releases.master_file_url IS 'Master audio file URL';
COMMENT ON COLUMN public.releases.ad_budget IS 'Advertising budget in EUR (net)';
COMMENT ON COLUMN public.releases.service_package IS 'Service package: basic (400€) or full (800€)';
COMMENT ON COLUMN public.releases.total_budget IS 'Total budget including service package and ad budget';
COMMENT ON COLUMN public.releases.user_type IS 'Type of user submitting: artist or manager';
COMMENT ON COLUMN public.releases.voucher_code IS 'Promotional voucher code if used';
COMMENT ON COLUMN public.releases.is_published IS 'Whether the release is already published on Spotify';
