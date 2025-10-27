-- Add facebook_page_url to artists table
ALTER TABLE public.artists 
  ADD COLUMN IF NOT EXISTS facebook_page_url TEXT;

-- Add comment
COMMENT ON COLUMN public.artists.facebook_page_url IS 'Facebook Fan Page URL for Instagram advertising access';
