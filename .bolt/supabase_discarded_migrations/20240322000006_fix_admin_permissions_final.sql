-- Drop and recreate the whatsapp_logs table
DROP TABLE IF EXISTS public.whatsapp_logs CASCADE;

CREATE TABLE public.whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feedback', 'video_deleted', 'video_renamed', 'type_changed', 'group_description', 'feedback_reminder', 'correction_reminder', 'group_access', 'api_request')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  message TEXT NOT NULL,
  error TEXT,
  metadata JSONB
);

-- Add whatsapp_invite_url to artists table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'artists' 
    AND column_name = 'whatsapp_invite_url'
  ) THEN
    ALTER TABLE public.artists ADD COLUMN whatsapp_invite_url TEXT;
  END IF;
END $$;

-- Update admin user permissions
DO $$ 
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@videofeedback.com';

  -- If admin user exists, update their permissions
  IF admin_user_id IS NOT NULL THEN
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'role', 'super_admin',
      'team', 'management',
      'is_admin', true
    )
    WHERE id = admin_user_id;

    -- Ensure admin user has service_role
    INSERT INTO auth.users_roles (user_id, role)
    VALUES (admin_user_id, 'service_role')
    ON CONFLICT DO NOTHING;

    -- Update or create admin profile
    INSERT INTO public.profiles (
      id,
      email,
      name,
      team,
      is_admin,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      'admin@videofeedback.com',
      'Super Admin',
      'management',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      team = 'management',
      is_admin = true,
      updated_at = NOW();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for whatsapp_logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_type ON public.whatsapp_logs(type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies
CREATE POLICY "WhatsApp logs are viewable by authenticated users"
  ON public.whatsapp_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "WhatsApp logs can be created by authenticated users"
  ON public.whatsapp_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 
      FROM auth.users u
      LEFT JOIN public.profiles p ON u.id = p.id
      WHERE u.id = auth.uid() 
      AND (
        u.email = 'admin@videofeedback.com' 
        OR (p.team = 'management' AND p.is_admin = true)
        OR u.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';