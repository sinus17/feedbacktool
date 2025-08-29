-- Update submission policies to allow all users to delete submissions
DROP POLICY IF EXISTS "Submissions are deletable by authenticated users only" ON public.submissions;

CREATE POLICY "Submissions are deletable by everyone"
  ON public.submissions FOR DELETE
  USING (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';