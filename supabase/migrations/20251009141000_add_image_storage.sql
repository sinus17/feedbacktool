-- Add columns for stored images (not just URLs from TikTok)
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS thumbnail_storage_url TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS creator_avatar_storage_url TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE video_library ADD COLUMN IF NOT EXISTS dynamic_cover_url TEXT;

-- Add comment
COMMENT ON COLUMN video_library.thumbnail_storage_url IS 'Thumbnail stored in Supabase Storage';
COMMENT ON COLUMN video_library.creator_avatar_storage_url IS 'Creator avatar stored in Supabase Storage';
COMMENT ON COLUMN video_library.cover_image_url IS 'Original cover image URL from TikTok';
COMMENT ON COLUMN video_library.dynamic_cover_url IS 'Dynamic/animated cover from TikTok';
