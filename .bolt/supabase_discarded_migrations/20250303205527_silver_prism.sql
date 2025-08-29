/*
  # Create content plan table

  1. New Tables
    - `content_plan_posts`
      - `id` (text, primary key)
      - `created_at` (timestamp)
      - `submission_id` (text, references submissions)
      - `artist_id` (text, references artists)
      - `scheduled_date` (timestamp)
      - `status` (text)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `content_plan_posts` table
    - Add policies for public access
*/

-- Create content plan posts table
CREATE TABLE IF NOT EXISTS public.content_plan_posts (
  id TEXT PRIMARY KEY DEFAULT LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  submission_id TEXT REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'posted', 'archived')) DEFAULT 'scheduled',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_plan_posts_submission_id ON public.content_plan_posts(submission_id);
CREATE INDEX IF NOT EXISTS idx_content_plan_posts_artist_id ON public.content_plan_posts(artist_id);
CREATE INDEX IF NOT EXISTS idx_content_plan_posts_scheduled_date ON public.content_plan_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_plan_posts_status ON public.content_plan_posts(status);

-- Enable RLS
ALTER TABLE public.content_plan_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public read access to content_plan_posts"
  ON public.content_plan_posts FOR SELECT
  USING (true);

CREATE POLICY "Public write access to content_plan_posts"
  ON public.content_plan_posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access to content_plan_posts"
  ON public.content_plan_posts FOR UPDATE
  USING (true);

CREATE POLICY "Public delete access to content_plan_posts"
  ON public.content_plan_posts FOR DELETE
  USING (true);

-- Grant permissions
GRANT ALL ON public.content_plan_posts TO anon;
GRANT ALL ON public.content_plan_posts TO authenticated;

-- Create trigger to update updated_at
CREATE TRIGGER update_content_plan_posts_updated_at
  BEFORE UPDATE ON public.content_plan_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';