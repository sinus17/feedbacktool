/*
  # Add archive_logs table for tracking archive actions
  
  1. New Tables
    - `archive_logs`: Tracks when entities are archived or unarchived
      - `id` (text, primary key)
      - `created_at` (timestamp with time zone)
      - `entity_type` (text, constrained to 'artist', 'submission', 'ad_creative')
      - `entity_id` (text)
      - `action` (text, constrained to 'archive', 'unarchive')
      - `reason` (text, optional)
      - `performed_by` (uuid, references auth.users)
      - `metadata` (jsonb)
  
  2. Security
    - Enable RLS on the table
    - Add policies for public read and write access
*/

-- Create archive_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.archive_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('artist', 'submission', 'ad_creative')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archive', 'unarchive')),
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_archive_logs_created_at ON public.archive_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_archive_logs_entity ON public.archive_logs(entity_type, entity_id);

-- Enable RLS if not already enabled
ALTER TABLE public.archive_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'archive_logs' AND policyname = 'Public read access to archive_logs'
  ) THEN
    DROP POLICY "Public read access to archive_logs" ON public.archive_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'archive_logs' AND policyname = 'Public write access to archive_logs'
  ) THEN
    DROP POLICY "Public write access to archive_logs" ON public.archive_logs;
  END IF;
END
$$;

-- Create policies
CREATE POLICY "Public read access to archive_logs"
  ON public.archive_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Public write access to archive_logs"
  ON public.archive_logs
  FOR INSERT
  WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';