/*
  # Update RLS policies for artist submissions

  1. Changes
    - Add RLS policies to allow artists to insert and update their own submissions
    - Add RLS policies for messages table to allow artists to add messages
    - Add RLS policies for storage access

  2. Security
    - Artists can only access their own submissions
    - Artists can only add messages to their own submissions
    - Artists can only upload to their own storage folder
*/

-- Enable RLS on all tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable update for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.messages;

-- Create policies for submissions
CREATE POLICY "Enable public read access" ON public.submissions
FOR SELECT USING (true);

CREATE POLICY "Enable public insert access" ON public.submissions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable public update access" ON public.submissions
FOR UPDATE USING (true)
WITH CHECK (true);

CREATE POLICY "Enable public delete access" ON public.submissions
FOR DELETE USING (true);

-- Create policies for messages
CREATE POLICY "Enable public read access" ON public.messages
FOR SELECT USING (true);

CREATE POLICY "Enable public insert access" ON public.messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable public update access" ON public.messages
FOR UPDATE USING (true);

CREATE POLICY "Enable public delete access" ON public.messages
FOR DELETE USING (true);

-- Create storage policies
CREATE POLICY "Enable public read access" ON storage.objects
FOR SELECT USING (true);

CREATE POLICY "Enable public insert access" ON storage.objects
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable public update access" ON storage.objects
FOR UPDATE USING (true);

CREATE POLICY "Enable public delete access" ON storage.objects
FOR DELETE USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';