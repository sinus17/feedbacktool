-- Create table for artist liked library videos
CREATE TABLE IF NOT EXISTS artist_liked_library_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES video_library(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(artist_id, video_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_artist_liked_videos_artist_id ON artist_liked_library_videos(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_liked_videos_video_id ON artist_liked_library_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_artist_liked_videos_created_at ON artist_liked_library_videos(created_at DESC);

-- Enable RLS
ALTER TABLE artist_liked_library_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all liked videos" ON artist_liked_library_videos
  FOR SELECT USING (true);

CREATE POLICY "Users can like videos" ON artist_liked_library_videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can unlike their videos" ON artist_liked_library_videos
  FOR DELETE USING (true);

COMMENT ON TABLE artist_liked_library_videos IS 'Stores which library videos each artist has liked for their favorites';
