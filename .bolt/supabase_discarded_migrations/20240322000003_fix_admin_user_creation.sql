-- Enable service_role access for admin functions
ALTER FUNCTION is_admin() SET config.role = 'service_role';

-- Update is_admin function to use service_role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _user_id uuid;
  _is_admin boolean;
BEGIN
  -- Get the current user ID
  _user_id := auth.uid();
  
  -- Check if user is admin using service_role
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE u.id = _user_id 
    AND (
      u.email = 'admin@videofeedback.com' 
      OR (p.team = 'management' AND p.is_admin = true)
      OR u.raw_user_meta_data->>'role' = 'super_admin'
    )
  ) INTO _is_admin;
  
  RETURN _is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin user management functions
CREATE OR REPLACE FUNCTION create_admin_user(
  email text,
  password text,
  name text,
  phone text,
  team text,
  is_admin boolean DEFAULT false
)
RETURNS json AS $$
DECLARE
  new_user json;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create user with service role
  new_user := auth.create_user(
    email := email,
    password := password,
    email_confirm := true,
    phone := phone,
    user_metadata := json_build_object(
      'name', name,
      'phone', phone,
      'team', team,
      'role', CASE WHEN team = 'management' THEN 'admin' ELSE 'user' END
    )
  );

  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    phone,
    team,
    is_admin
  ) VALUES (
    (new_user->>'id')::uuid,
    email,
    name,
    phone,
    team,
    is_admin OR team = 'management'
  );

  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Update policies for profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can create profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Ensure super admin exists and has proper permissions
DO $$ 
BEGIN
  -- Ensure admin user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@videofeedback.com'
  ) THEN
    PERFORM auth.create_user(
      email := 'admin@videofeedback.com',
      password := 'admin',
      email_confirm := true,
      user_metadata := '{"role": "super_admin", "team": "management"}'::jsonb
    );
  END IF;

  -- Update admin user's metadata and roles
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
  )
  WHERE email = 'admin@videofeedback.com';

  -- Ensure admin profile exists
  INSERT INTO public.profiles (
    id,
    email,
    name,
    team,
    is_admin
  )
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
END $$;