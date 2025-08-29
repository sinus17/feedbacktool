-- Enable cascade delete for submissions and messages
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

-- Update RLS policies to allow deletion
DROP POLICY IF EXISTS "Artists are deletable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Submissions are deletable by everyone" ON public.submissions;
DROP POLICY IF EXISTS "Messages are deletable by everyone" ON public.messages;

CREATE POLICY "Artists are deletable by everyone"
  ON public.artists FOR DELETE
  USING (true);

CREATE POLICY "Submissions are deletable by everyone"
  ON public.submissions FOR DELETE
  USING (true);

CREATE POLICY "Messages are deletable by everyone"
  ON public.messages FOR DELETE
  USING (true);

-- Grant necessary permissions
GRANT ALL ON public.artists TO anon, authenticated;
GRANT ALL ON public.submissions TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';