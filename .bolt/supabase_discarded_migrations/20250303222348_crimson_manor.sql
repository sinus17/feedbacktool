-- Enable cron extension
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA "extensions";

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cleanup_old_videos();

-- Create function to clean up old videos
CREATE OR REPLACE FUNCTION cleanup_old_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'videos'
  AND created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a scheduled job to run cleanup every day
SELECT extensions.pg_cron.schedule(
  'cleanup-old-videos',
  '0 0 * * *', -- Run at midnight every day
  $$SELECT cleanup_old_videos()$$
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';