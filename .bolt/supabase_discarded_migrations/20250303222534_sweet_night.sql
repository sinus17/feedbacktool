/*
  # Remove video auto-delete functionality
  
  1. Changes
    - Drop the cleanup_old_videos function
    - Remove the scheduled cron job
    - Keep the videos bucket and its policies
*/

-- Drop the scheduled job if it exists
SELECT extensions.pg_cron.unschedule('cleanup-old-videos');

-- Drop the cleanup function
DROP FUNCTION IF EXISTS cleanup_old_videos();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';