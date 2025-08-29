-- Drop and recreate whatsapp_logs table with updated type constraint
DROP TABLE IF EXISTS public.whatsapp_logs CASCADE;

CREATE TABLE public.whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'feedback',
    'video_deleted',
    'video_renamed',
    'type_changed',
    'group_description',
    'feedback_reminder',
    'correction_reminder',
    'group_access',
    'message_deleted',
    'ad_creative_submission',
    'submission',
    'notification',
    'whatsapp_message',
    'api_request'
  )),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT NOT NULL,
  error TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_type ON public.whatsapp_logs(type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to whatsapp_logs"
  ON public.whatsapp_logs FOR SELECT
  USING (true);

CREATE POLICY "Public write access to whatsapp_logs"
  ON public.whatsapp_logs FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.whatsapp_logs TO anon;
GRANT ALL ON public.whatsapp_logs TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';