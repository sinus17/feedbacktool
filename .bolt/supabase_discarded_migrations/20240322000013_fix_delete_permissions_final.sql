-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Enable full access for artists" ON public.artists;
DROP POLICY IF EXISTS "Enable full access for submissions" ON public.submissions;
DROP POLICY IF EXISTS "Enable full access for messages" ON public.messages;

-- Create new unrestricted policies with explicit DELETE permissions
CREATE POLICY "Public read access to artists"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Public write access to artists"
  ON public.artists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to artists"
  ON public.artists FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to artists"
  ON public.artists FOR DELETE
  USING (true);

CREATE POLICY "Public read access to submissions"
  ON public.submissions FOR SELECT
  USING (true);

CREATE POLICY "Public write access to submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to submissions"
  ON public.submissions FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to submissions"
  ON public.submissions FOR DELETE
  USING (true);

CREATE POLICY "Public read access to messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Public write access to messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to messages"
  ON public.messages FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to messages"
  ON public.messages FOR DELETE
  USING (true);

-- Grant ALL permissions to public role
GRANT ALL ON public.artists TO anon;
GRANT ALL ON public.submissions TO anon;
GRANT ALL ON public.messages TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure cascade deletes are properly set up
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_submission_id_fkey,
  ADD CONSTRAINT messages_submission_id_fkey
    FOREIGN KEY (submission_id)
    REFERENCES public.submissions(id)
    ON DELETE CASCADE;

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_artist_id_fkey,
  ADD CONSTRAINT submissions_artist_id_fkey
    FOREIGN KEY (artist_id)
    REFERENCES public.artists(id)
    ON DELETE CASCADE;

-- Disable RLS temporarily to ensure it's properly re-enabled
ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with the new policies
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';