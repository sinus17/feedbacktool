/*
  # Update RLS policies for submissions

  1. Changes
    - Add public write access policies for submissions table
    - Allow public insert/update/delete operations
    - Keep existing read access policy

  2. Security
    - Enable RLS on submissions table
    - Add policies for all CRUD operations
    - Maintain data integrity while allowing public access
*/

-- First ensure RLS is enabled
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable update for all users" ON public.submissions;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.submissions;

-- Create comprehensive RLS policies
CREATE POLICY "Enable read access for all users"
ON public.submissions FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON public.submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON public.submissions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON public.submissions FOR DELETE
USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';