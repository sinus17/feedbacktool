-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Artists are viewable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Artists are insertable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Artists are updatable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Artists are deletable by everyone" ON public.artists;

DROP POLICY IF EXISTS "Submissions are viewable by everyone" ON public.submissions;
DROP POLICY IF EXISTS "Submissions are insertable by everyone" ON public.submissions;
DROP POLICY IF EXISTS "Submissions are updatable by everyone" ON public.submissions;
DROP POLICY IF EXISTS "Submissions are deletable by everyone" ON public.submissions;

DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Messages are insertable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Messages are updatable by everyone" ON public.messages;
DROP POLICY IF EXISTS "Messages are deletable by everyone" ON public.messages;

-- Create new unrestricted policies
CREATE POLICY "Enable full access for artists"
  ON public.artists
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable full access for submissions"
  ON public.submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable full access for messages"
  ON public.messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant all permissions to both anonymous and authenticated users
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.artists TO anon, authenticated;
GRANT ALL ON public.submissions TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

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

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';