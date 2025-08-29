-- Create WhatsApp logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feedback', 'video_deleted', 'video_renamed', 'type_changed', 'group_description', 'feedback_reminder', 'correction_reminder', 'group_access')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT NOT NULL,
  error TEXT,
  metadata JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_type ON public.whatsapp_logs(type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "WhatsApp logs are viewable by authenticated users"
  ON public.whatsapp_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "WhatsApp logs can be created by authenticated users"
  ON public.whatsapp_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.whatsapp_logs TO authenticated;