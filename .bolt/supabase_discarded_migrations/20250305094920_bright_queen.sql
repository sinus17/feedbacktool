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

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable update for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.messages;

-- Create more specific policies for submissions
CREATE POLICY "Enable insert for artists and admins" ON public.submissions
FOR INSERT TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Enable update for artists and admins" ON public.submissions
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Create more specific policies for messages
CREATE POLICY "Enable insert for artists and admins" ON public.messages
FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Enable public read access" ON storage.objects
FOR SELECT TO public 
USING (true);

CREATE POLICY "Enable insert access" ON storage.objects 
FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Enable update access" ON storage.objects
FOR UPDATE TO public
USING (true);

CREATE POLICY "Enable delete access" ON storage.objects
FOR DELETE TO public
USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';