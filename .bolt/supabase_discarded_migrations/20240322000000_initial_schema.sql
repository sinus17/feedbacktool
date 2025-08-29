-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.whatsapp_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.artists CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  team TEXT CHECK (team IN ('management', 'production', 'marketing', 'support')),
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false
);

-- Create artists table
CREATE TABLE public.artists (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  element_id TEXT,
  whatsapp_group_id TEXT,
  whatsapp_invite_url TEXT,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_submissions_artist_id ON public.submissions(artist_id);
CREATE INDEX IF NOT EXISTS idx_messages_submission_id ON public.messages(submission_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (
        email = 'admin@videofeedback.com'
        OR team = 'management'
        OR is_admin = true
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Only admins can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (is_admin());

-- Artists policies
CREATE POLICY "Artists are viewable by everyone"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Artists are insertable by authenticated users only"
  ON public.artists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Artists are updatable by authenticated users only"
  ON public.artists FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Artists are deletable by authenticated users only"
  ON public.artists FOR DELETE
  USING (auth.role() = 'authenticated');

-- Submissions policies
CREATE POLICY "Submissions are viewable by everyone"
  ON public.submissions FOR SELECT
  USING (true);

CREATE POLICY "Submissions are insertable by everyone"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Submissions are updatable by authenticated users only"
  ON public.submissions FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Submissions are deletable by authenticated users only"
  ON public.submissions FOR DELETE
  USING (auth.role() = 'authenticated');

-- Messages policies
CREATE POLICY "Messages are viewable by everyone"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Messages are insertable by everyone"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Messages are updatable by authenticated users only"
  ON public.messages FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Messages are deletable by authenticated users only"
  ON public.messages FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger to handle user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, team, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'team', 'support'),
    CASE 
      WHEN NEW.email = 'admin@videofeedback.com' THEN true
      WHEN NEW.raw_user_meta_data->>'team' = 'management' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();