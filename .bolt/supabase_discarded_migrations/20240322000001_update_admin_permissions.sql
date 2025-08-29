-- First, ensure the user exists in the profiles table
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

-- Grant super admin role to the user
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'admin@videofeedback.com';

-- Ensure the user has the authenticated role
INSERT INTO auth.users_roles (user_id, role)
SELECT id, 'authenticated'
FROM auth.users
WHERE email = 'admin@videofeedback.com'
ON CONFLICT DO NOTHING;