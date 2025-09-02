/*
  # Auto-move ready videos to Ad Creatives
  
  1. Changes
    - Create trigger function to automatically move videos to ad_creatives when status changes to 'ready'
    - Add trigger on submissions table for status updates
    - Only create ad creative if one doesn't already exist for the submission
  
  2. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER for proper permissions
*/

-- Create function to automatically move ready videos to ad creatives
CREATE OR REPLACE FUNCTION auto_move_ready_to_ad_creatives()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to 'ready' and it wasn't 'ready' before
  IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
    -- Check if ad creative doesn't already exist for this submission
    IF NOT EXISTS (
      SELECT 1 FROM public.ad_creatives 
      WHERE submission_id = NEW.id::text 
      OR content = NEW.video_url
    ) THEN
      -- Insert into ad_creatives
      INSERT INTO public.ad_creatives (
        artists_id,
        platform,
        content,
        status,
        video_name,
        submission_id,
        created_at,
        updated_at
      ) VALUES (
        NEW.artist_id,
        CASE 
          WHEN NEW.video_url LIKE '%supabase.co/storage/v1/object/public/%' THEN 'direct_upload'
          ELSE 'dropbox'
        END,
        NEW.video_url,
        'pending',
        NEW.project_name,
        NEW.id::text,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Auto-moved submission % (%) to ad creatives', NEW.id, NEW.project_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on submissions table
DROP TRIGGER IF EXISTS trigger_auto_move_ready_to_ad_creatives ON public.submissions;
CREATE TRIGGER trigger_auto_move_ready_to_ad_creatives
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_move_ready_to_ad_creatives();

-- Manually move the existing VSL video that should have been moved automatically
INSERT INTO public.ad_creatives (
  artists_id,
  platform,
  content,
  status,
  video_name,
  submission_id,
  created_at,
  updated_at
)
SELECT 
  s.artist_id,
  CASE 
    WHEN s.video_url LIKE '%supabase.co/storage/v1/object/public/%' THEN 'direct_upload'
    ELSE 'dropbox'
  END,
  s.video_url,
  'pending',
  s.project_name,
  s.id::text,
  NOW(),
  NOW()
FROM public.submissions s
WHERE s.id = '21505161'
  AND s.status = 'ready'
  AND NOT EXISTS (
    SELECT 1 FROM public.ad_creatives 
    WHERE submission_id = s.id::text 
    OR content = s.video_url
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
