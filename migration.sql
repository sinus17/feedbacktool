-- Update status check constraint
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check 
  CHECK (status IN ('new', 'feedback-needed', 'correction-needed', 'ready', 'posted'));