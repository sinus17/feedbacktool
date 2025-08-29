/*
  # Add updated_at column to content_plan_posts table
  
  1. Changes
    - Add updated_at column to content_plan_posts table
    - Add trigger to automatically update the updated_at column
    - Ensure consistent behavior with other tables
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add updated_at column to content_plan_posts table
ALTER TABLE public.content_plan_posts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_content_plan_posts_updated_at ON public.content_plan_posts;
CREATE TRIGGER update_content_plan_posts_updated_at
  BEFORE UPDATE ON public.content_plan_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';