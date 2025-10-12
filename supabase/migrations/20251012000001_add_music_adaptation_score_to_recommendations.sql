-- Add music_adaptation_score and is_adaptable columns to video_library_recommendations table
ALTER TABLE video_library_recommendations 
ADD COLUMN IF NOT EXISTS music_adaptation_score INTEGER,
ADD COLUMN IF NOT EXISTS is_adaptable BOOLEAN DEFAULT false;

-- Add comments to explain the columns
COMMENT ON COLUMN video_library_recommendations.music_adaptation_score IS 'Score from 0-10 indicating how well this video concept can be adapted for music promotion';
COMMENT ON COLUMN video_library_recommendations.is_adaptable IS 'Whether this video is adaptable for music promotion (score >= 7)';
