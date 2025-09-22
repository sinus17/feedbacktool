-- Add video_length column to submissions table
-- This stores the actual video duration in seconds for accurate time calculations

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS video_length INTEGER;

COMMENT ON COLUMN submissions.video_length IS 'Video duration in seconds';

-- Create index for performance when querying by video length
CREATE INDEX IF NOT EXISTS idx_submissions_video_length ON submissions(video_length);
