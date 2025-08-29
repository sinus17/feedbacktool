-- First ensure the user exists and has the correct metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
  'role', 'super_admin',
  'team', 'management',
  'is_admin', true
)
WHERE email = 'admin@videofeedback.com';

-- Ensure the user has the service_role
INSERT INTO auth.users_roles (user_id, role)
SELECT id, 'service_role'
FROM auth.users
WHERE email = 'admin@videofeedback.com'
ON CONFLICT DO NOTHING;

-- Update or create the profile with admin privileges
INSERT INTO public.profiles (
  id,
  email,
  name,
  team,
  is_admin,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Super Admin'),
  'management',
  true,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@videofeedback.com'
ON CONFLICT (id) DO UPDATE
SET 
  team = 'management',
  is_admin = true,
  updated_at = NOW();

-- Grant all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Refresh the policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;