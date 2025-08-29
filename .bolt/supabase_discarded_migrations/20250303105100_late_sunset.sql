/*
  # Add app_settings table

  1. New Tables
    - `app_settings`
      - `key` (text, primary key)
      - `value` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `app_settings` table
    - Add policies for authenticated users
*/

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trigger to update updated_at column
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update app_settings"
  ON public.app_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert app_settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;

-- Insert default WhatsApp notification settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'whatsapp_notifications',
  '{
    "feedbackGroupId": "120363291976373833",
    "adCreativeGroupId": "120363376937486419",
    "artistTemplates": {
      "feedbackReceived": "📝 *New Feedback*\n\nProject: {{projectName}}\n\n{{feedback}}\n\nStatus: {{status}}\n\n🔗 View details: {{url}}",
      "videoStatusChanged": "🎬 *Video Status Update*\n\nProject: {{projectName}}\n\nYour video status has been updated to: {{status}}\n\n🔗 View details: {{url}}",
      "adCreativeStatusChanged": "🎥 *Ad Creative Update*\n\nPlatform: {{platform}}\nContent: {{content}}\n\nStatus: {{status}}\n{{rejectionReason}}\n\n🔗 View details: {{url}}"
    },
    "notifyArtistsFor": {
      "feedbackReceived": true,
      "videoStatusChanged": true,
      "adCreativeStatusChanged": true
    }
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';