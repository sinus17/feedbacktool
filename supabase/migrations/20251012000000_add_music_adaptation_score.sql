-- Add music_adaptation_score column to video_library table
ALTER TABLE video_library 
ADD COLUMN IF NOT EXISTS music_adaptation_score INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN video_library.music_adaptation_score IS 'Score from 0-10 indicating how well this video concept can be adapted for music promotion';
