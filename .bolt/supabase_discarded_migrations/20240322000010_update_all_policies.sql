-- Drop existing policies
DROP POLICY IF EXISTS "Artists are insertable by authenticated users only" ON public.artists;
DROP POLICY IF EXISTS "Artists are updatable by authenticated users only" ON public.artists;
DROP POLICY IF EXISTS "Artists are deletable by authenticated users only" ON public.artists;
DROP POLICY IF EXISTS "Submissions are insertable by authenticated users only" ON public.submissions;
DROP POLICY IF EXISTS "Submissions are updatable by authenticated users only" ON public.submissions;
DROP POLICY IF EXISTS "Submissions are deletable by authenticated users only" ON public.submissions;

-- Create new policies for artists
CREATE POLICY "Artists are insertable by everyone"
  ON public.artists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Artists are updatable by everyone"
  ON public.artists FOR UPDATE
  USING (true);

CREATE POLICY "Artists are deletable by everyone"
  ON public.artists FOR DELETE
  USING (true);

-- Create new policies for submissions
CREATE POLICY "Submissions are insertable by everyone"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Submissions are updatable by everyone"
  ON public.submissions FOR UPDATE
  USING (true);

CREATE POLICY "Submissions are deletable by everyone"
  ON public.submissions FOR DELETE
  USING (true);

-- Create new policies for messages
CREATE POLICY "Messages are insertable by everyone"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Messages are updatable by everyone"
  ON public.messages FOR UPDATE
  USING (true);

CREATE POLICY "Messages are deletable by everyone"
  ON public.messages FOR DELETE
  USING (true);

-- Grant necessary permissions
GRANT ALL ON public.artists TO anon;
GRANT ALL ON public.submissions TO anon;
GRANT ALL ON public.messages TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';