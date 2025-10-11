-- Create video_library_recommendations table (duplicate of video_library structure)
CREATE TABLE IF NOT EXISTS video_library_recommendations (
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
  collect_count BIGINT DEFAULT 0,
  
  -- Storage
  video_url TEXT, -- Supabase storage URL
  thumbnail_url TEXT,
  thumbnail_storage_url TEXT,
  
  -- Creator/Author info
  follower_count BIGINT DEFAULT 0,
  creator_avatar_url TEXT,
  creator_avatar_storage_url TEXT,
  author_verified BOOLEAN DEFAULT false,
  
  -- Music information
  music_title TEXT,
  music_author TEXT,
  is_original_sound BOOLEAN DEFAULT false,
  music_cover_thumb TEXT,
  music_video_count INTEGER DEFAULT 0,
  
  -- Location information
  location_name TEXT,
  location_city TEXT,
  location_country TEXT,
  location_address TEXT,
  
  -- Categorization
  genre TEXT,
  category TEXT,
  tags TEXT[],
  type TEXT,
  actor TEXT,
  diversification_labels TEXT[],
  suggested_words TEXT[],
  
  -- Photo post support
  is_photo_post BOOLEAN DEFAULT false,
  image_urls TEXT[],
  
  -- Curation Content
  content_description TEXT,
  why_it_works TEXT,
  artist_recommendation TEXT,
  
  -- AI Analysis
  gemini_analysis TEXT,
  gemini_analysis_en TEXT,
  gemini_analyzed_at TIMESTAMPTZ,
  
  -- API Data
  raw_api_data JSONB,
  
  -- Recommendation specific fields
  recommendation_source TEXT DEFAULT 'tiktok_ads_api', -- Source of the recommendation
  recommendation_period INTEGER DEFAULT 7, -- Period in days (7 for last 7 days)
  recommendation_country TEXT DEFAULT 'US', -- Country code
  recommendation_industry TEXT DEFAULT '23116000000', -- Industry code (Culture & Art)
  recommendation_ctr DECIMAL(10, 6), -- Click-through rate from ads API
  recommendation_cost INTEGER, -- Cost from ads API
  recommendation_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
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
CREATE INDEX idx_video_library_recommendations_platform ON video_library_recommendations(platform);
CREATE INDEX idx_video_library_recommendations_genre ON video_library_recommendations(genre);
CREATE INDEX idx_video_library_recommendations_category ON video_library_recommendations(category);
CREATE INDEX idx_video_library_recommendations_tags ON video_library_recommendations USING GIN(tags);
CREATE INDEX idx_video_library_recommendations_processing_status ON video_library_recommendations(processing_status);
CREATE INDEX idx_video_library_recommendations_is_published ON video_library_recommendations(is_published);
CREATE INDEX idx_video_library_recommendations_featured ON video_library_recommendations(featured);
CREATE INDEX idx_video_library_recommendations_created_at ON video_library_recommendations(created_at DESC);
CREATE INDEX idx_video_library_recommendations_ctr ON video_library_recommendations(recommendation_ctr DESC);
CREATE INDEX idx_video_library_recommendations_fetched_at ON video_library_recommendations(recommendation_fetched_at DESC);
CREATE INDEX idx_video_library_recommendations_industry ON video_library_recommendations(recommendation_industry);
CREATE INDEX idx_video_library_recommendations_country ON video_library_recommendations(recommendation_country);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_video_library_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_library_recommendations_updated_at
  BEFORE UPDATE ON video_library_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_video_library_recommendations_updated_at();

-- RLS Policies for video_library_recommendations
ALTER TABLE video_library_recommendations ENABLE ROW LEVEL SECURITY;

-- Everyone can view published recommendations
CREATE POLICY "Anyone can view published recommendations"
ON video_library_recommendations FOR SELECT
TO public
USING (is_published = true);

-- Authenticated users can view all recommendations
CREATE POLICY "Authenticated users can view all recommendations"
ON video_library_recommendations FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert recommendations
CREATE POLICY "Authenticated users can insert recommendations"
ON video_library_recommendations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update recommendations
CREATE POLICY "Authenticated users can update recommendations"
ON video_library_recommendations FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete recommendations
CREATE POLICY "Authenticated users can delete recommendations"
ON video_library_recommendations FOR DELETE
TO authenticated
USING (true);
