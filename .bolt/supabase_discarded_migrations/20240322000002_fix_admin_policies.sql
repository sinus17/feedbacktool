-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;

-- Update is_admin function to properly check super admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 
      FROM auth.users u
      LEFT JOIN public.profiles p ON u.id = p.id
      WHERE u.id = auth.uid() AND (
        u.email = 'admin@videofeedback.com' OR
        (p.team = 'management' AND p.is_admin = true) OR
        u.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new admin policies with proper checks
CREATE POLICY "Admins can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (is_admin());

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.artists TO authenticated;
GRANT ALL ON public.submissions TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.whatsapp_logs TO authenticated;

-- Ensure admin@videofeedback.com has super admin privileges
DO $$ 
BEGIN
  -- Update or insert admin user profile
  INSERT INTO public.profiles (id, email, name, team, is_admin)
  SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', 'Super Admin'),
    'management',
    true
  FROM auth.users
  WHERE email = 'admin@videofeedback.com'
  ON CONFLICT (id) DO UPDATE
  SET 
    team = 'management',
    is_admin = true,
    updated_at = timezone('utc'::text, now());

  -- Update admin user metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
  )
  WHERE email = 'admin@videofeedback.com';

  -- Ensure admin has authenticated role
  INSERT INTO auth.users_roles (user_id, role)
  SELECT id, 'authenticated'
  FROM auth.users
  WHERE email = 'admin@videofeedback.com'
  ON CONFLICT DO NOTHING;
END $$;