-- Add archived status to submissions table
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check 
  CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'posted', 'archived'));

-- Add archived status to artists table
ALTER TABLE public.artists
  ADD COLUMN archived BOOLEAN DEFAULT false;

-- Add archived status to ad_creatives table
ALTER TABLE public.ad_creatives
  DROP CONSTRAINT IF EXISTS ad_creatives_status_check;

ALTER TABLE public.ad_creatives
  ADD CONSTRAINT ad_creatives_status_check 
  CHECK (status IN ('pending', 'active', 'archived', 'rejected'));

-- Create archive_logs table to track archive actions
CREATE TABLE public.archive_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('artist', 'submission', 'ad_creative')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archive', 'unarchive')),
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_archive_logs_entity ON archive_logs(entity_type, entity_id);
CREATE INDEX idx_archive_logs_created_at ON archive_logs(created_at);

-- Enable RLS
ALTER TABLE public.archive_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to archive_logs"
  ON public.archive_logs FOR SELECT
  USING (true);

CREATE POLICY "Public write access to archive_logs"
  ON public.archive_logs FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.archive_logs TO anon;
GRANT ALL ON public.archive_logs TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';