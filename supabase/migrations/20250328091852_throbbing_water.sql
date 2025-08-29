/*
  # Add RLS policies for content plan posts
  
  1. Changes
    - Enable RLS on content_plan_posts table
    - Add policies for authenticated users to manage their own content
    - Add policies for admin access
  
  2. Security
    - Artists can only view and manage content plan posts where they are the artist_id
    - Admins have full access to all content plan posts
*/

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND (
        email = 'admin@videofeedback.com'
        OR raw_user_meta_data->>'team' = 'management'
      )
    )
  );
END;
$$;

-- Enable RLS
ALTER TABLE public.content_plan_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for content plan posts
CREATE POLICY "Admins have full access to content plan posts"
  ON public.content_plan_posts
  FOR ALL
  USING (is_admin());

CREATE POLICY "Artists can view their own content plan posts"
  ON public.content_plan_posts
  FOR SELECT
  USING (
    artist_id IN (
      SELECT id::text
      FROM artists
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Artists can manage their own content plan posts"
  ON public.content_plan_posts
  FOR INSERT
  WITH CHECK (
    artist_id IN (
      SELECT id::text
      FROM artists
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Artists can update their own content plan posts"
  ON public.content_plan_posts
  FOR UPDATE
  USING (
    artist_id IN (
      SELECT id::text
      FROM artists
      WHERE id::text = auth.uid()::text
    )
  );

CREATE POLICY "Artists can delete their own content plan posts"
  ON public.content_plan_posts
  FOR DELETE
  USING (
    artist_id IN (
      SELECT id::text
      FROM artists
      WHERE id::text = auth.uid()::text
    )
  );