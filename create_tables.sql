-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.whatsapp_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.artists CASCADE;

-- Create artists table
CREATE TABLE public.artists (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  element_id TEXT,
  whatsapp_group_id TEXT,
  submissions INTEGER DEFAULT 0,
  last_submission TIMESTAMP WITH TIME ZONE
);

-- Create submissions table
CREATE TABLE public.submissions (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  project_name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('song-specific', 'off-topic')),
  status TEXT NOT NULL CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready')) DEFAULT 'new',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  submission_id TEXT REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL,
  video_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create WhatsApp logs table
CREATE TABLE public.whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feedback', 'video_deleted', 'video_renamed', 'type_changed', 'group_description')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT NOT NULL,
  error TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submissions_artist_id ON public.submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_messages_submission_id ON public.messages(submission_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_type ON public.whatsapp_logs(type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.artists FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.artists FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.artists FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.submissions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.submissions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.messages FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.messages FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.whatsapp_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.whatsapp_logs FOR INSERT WITH CHECK (true);