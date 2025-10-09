-- Add new columns to video_library table for extended TikTok data

-- Engagement metrics
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS collect_count BIGINT DEFAULT 0;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS repost_count BIGINT DEFAULT 0;

-- Creator/Author stats
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS follower_count BIGINT DEFAULT 0;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS creator_heart_count BIGINT DEFAULT 0;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS creator_video_count INTEGER DEFAULT 0;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS creator_avatar_url TEXT;

-- Music information
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS music_title TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS music_author TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS is_original_sound BOOLEAN DEFAULT false;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS music_url TEXT;

-- Location information
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Video technical details
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS video_quality TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS video_bitrate INTEGER;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS video_width INTEGER;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS video_height INTEGER;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS video_codec TEXT;

-- Complex data as JSONB
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS raw_api_data JSONB;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS challenges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS text_extra JSONB DEFAULT '[]'::jsonb;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS subtitles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS anchors JSONB DEFAULT '[]'::jsonb;

-- Additional metadata
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS is_ad BOOLEAN DEFAULT false;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS duet_enabled BOOLEAN DEFAULT true;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS stitch_enabled BOOLEAN DEFAULT true;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT true;

-- Create indexes for new searchable columns
CREATE INDEX IF NOT EXISTS idx_video_library_location_city ON video_library(location_city);
CREATE INDEX IF NOT EXISTS idx_video_library_location_country ON video_library(location_country);
CREATE INDEX IF NOT EXISTS idx_video_library_music_author ON video_library(music_author);
CREATE INDEX IF NOT EXISTS idx_video_library_is_original_sound ON video_library(is_original_sound);
CREATE INDEX IF NOT EXISTS idx_video_library_challenges ON video_library USING GIN(challenges);

-- Add comment
COMMENT ON COLUMN video_library.raw_api_data IS 'Complete API response from TikTok for debugging and future features';
COMMENT ON COLUMN video_library.challenges IS 'Array of hashtags/challenges used in the video';
COMMENT ON COLUMN video_library.text_extra IS 'Mentions, links, and other text metadata';
COMMENT ON COLUMN video_library.subtitles IS 'Available subtitle languages and URLs';
