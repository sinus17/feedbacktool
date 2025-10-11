-- Add hashtags column to video_library_recommendations table
ALTER TABLE video_library_recommendations 
ADD COLUMN IF NOT EXISTS hashtags TEXT[];

-- Create index for hashtags
CREATE INDEX IF NOT EXISTS idx_video_library_recommendations_hashtags 
ON video_library_recommendations USING GIN(hashtags);
