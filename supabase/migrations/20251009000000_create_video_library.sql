-- Create video_library table
CREATE TABLE IF NOT EXISTS video_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Information
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  source_url TEXT NOT NULL UNIQUE,
  video_id TEXT NOT NULL,
  account_username TEXT,
  account_name TEXT,
  
  -- Video Details
  title TEXT,
  description TEXT,
  upload_date TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  views_count BIGINT,
  likes_count BIGINT,
  comments_count BIGINT,
  shares_count BIGINT,
  
  -- Storage
  video_url TEXT, -- Supabase storage URL
  thumbnail_url TEXT,
  
  -- Categorization
  genre TEXT, -- e.g., "Music", "Comedy", "Dance", etc.
  category TEXT, -- e.g., "Tutorial", "Performance", "Behind the Scenes"
  tags TEXT[], -- Array of tags
  
  -- Curation Content
  content_description TEXT, -- What happens in the video
  why_it_works TEXT, -- Analysis of why this video performs well
  artist_recommendation TEXT, -- How artists can use this as inspiration
  
  -- Processing Status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Visibility
  is_published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX idx_video_library_platform ON video_library(platform);
CREATE INDEX idx_video_library_genre ON video_library(genre);
CREATE INDEX idx_video_library_category ON video_library(category);
CREATE INDEX idx_video_library_tags ON video_library USING GIN(tags);
CREATE INDEX idx_video_library_processing_status ON video_library(processing_status);
CREATE INDEX idx_video_library_is_published ON video_library(is_published);
CREATE INDEX idx_video_library_featured ON video_library(featured);
CREATE INDEX idx_video_library_created_at ON video_library(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_video_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_library_updated_at
  BEFORE UPDATE ON video_library
  FOR EACH ROW
  EXECUTE FUNCTION update_video_library_updated_at();

-- Create video_library_queue table for processing
CREATE TABLE IF NOT EXISTS video_library_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  source_url TEXT NOT NULL,
  
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  
  video_library_id UUID REFERENCES video_library(id) ON DELETE SET NULL
);

CREATE INDEX idx_video_library_queue_status ON video_library_queue(status);
CREATE INDEX idx_video_library_queue_created_at ON video_library_queue(created_at DESC);

-- Create storage bucket for library videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-videos', 'library-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for library-videos bucket
CREATE POLICY "Public can view library videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'library-videos');

CREATE POLICY "Authenticated users can upload library videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'library-videos');

CREATE POLICY "Authenticated users can update library videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'library-videos');

CREATE POLICY "Authenticated users can delete library videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'library-videos');

-- RLS Policies for video_library
ALTER TABLE video_library ENABLE ROW LEVEL SECURITY;

-- Everyone can view published videos
CREATE POLICY "Anyone can view published videos"
ON video_library FOR SELECT
TO public
USING (is_published = true);

-- Authenticated users can view all videos (for admin/management)
CREATE POLICY "Authenticated users can view all videos"
ON video_library FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert videos
CREATE POLICY "Authenticated users can insert videos"
ON video_library FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update videos
CREATE POLICY "Authenticated users can update videos"
ON video_library FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete videos
CREATE POLICY "Authenticated users can delete videos"
ON video_library FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for video_library_queue
ALTER TABLE video_library_queue ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view queue
CREATE POLICY "Authenticated users can view queue"
ON video_library_queue FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert to queue
CREATE POLICY "Authenticated users can insert to queue"
ON video_library_queue FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update queue
CREATE POLICY "Authenticated users can update queue"
ON video_library_queue FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete from queue
CREATE POLICY "Authenticated users can delete from queue"
ON video_library_queue FOR DELETE
TO authenticated
USING (true);
