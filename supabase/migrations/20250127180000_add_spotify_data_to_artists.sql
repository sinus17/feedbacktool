-- Add Spotify data columns to artists table
ALTER TABLE public.artists 
  ADD COLUMN IF NOT EXISTS spotify_image TEXT,
  ADD COLUMN IF NOT EXISTS spotify_genres TEXT[],
  ADD COLUMN IF NOT EXISTS spotify_popularity INTEGER,
  ADD COLUMN IF NOT EXISTS spotify_followers INTEGER,
  ADD COLUMN IF NOT EXISTS spotify_related_artists JSONB,
  ADD COLUMN IF NOT EXISTS spotify_last_synced TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_artists_spotify_last_synced ON public.artists(spotify_last_synced);

-- Comment on columns
COMMENT ON COLUMN public.artists.spotify_image IS 'Artist profile image URL from Spotify';
COMMENT ON COLUMN public.artists.spotify_genres IS 'Array of genres from Spotify';
COMMENT ON COLUMN public.artists.spotify_popularity IS 'Popularity score (0-100) from Spotify';
COMMENT ON COLUMN public.artists.spotify_followers IS 'Total follower count from Spotify';
COMMENT ON COLUMN public.artists.spotify_related_artists IS 'JSON array of related artists from Spotify';
COMMENT ON COLUMN public.artists.spotify_last_synced IS 'Last time Spotify data was fetched';
