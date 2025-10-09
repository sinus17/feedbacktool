-- Create likes table for video likes
CREATE TABLE IF NOT EXISTS public.video_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_library(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure either user_id or artist_id is set, but not both
  CONSTRAINT check_user_or_artist CHECK (
    (user_id IS NOT NULL AND artist_id IS NULL) OR 
    (user_id IS NULL AND artist_id IS NOT NULL)
  ),
  
  -- Prevent duplicate likes from same user/artist on same video
  CONSTRAINT unique_video_user_like UNIQUE (video_id, user_id),
  CONSTRAINT unique_video_artist_like UNIQUE (video_id, artist_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON public.video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_artist_id ON public.video_likes(artist_id);

-- Enable RLS
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all likes
CREATE POLICY "Users can view all likes"
  ON public.video_likes FOR SELECT
  USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can insert their own likes"
  ON public.video_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.artists WHERE id = artist_id));

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
  ON public.video_likes FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.artists WHERE id = artist_id));

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT SELECT ON public.video_likes TO anon;
