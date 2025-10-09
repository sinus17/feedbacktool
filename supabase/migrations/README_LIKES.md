# Video Likes Feature

## Database Migration

Run the migration to create the `video_likes` table:

```bash
# Apply the migration
supabase db push

# Or if using Supabase CLI locally
supabase migration up
```

## After Migration

1. **Regenerate TypeScript types:**
   ```bash
   npx supabase gen types typescript --project-id wrlgoxbzlngdtomjhvnz > src/types/supabase.ts
   ```

2. The TypeScript errors in `FeedView.tsx` will be resolved once types are regenerated.

## Features Implemented

### Double-Tap to Like
- Users can double-tap on a video to like it
- Shows animated red heart on double-tap
- Heart icon fills with red when liked

### Like Button
- Click the heart icon in the stats column to toggle like
- Red filled heart when liked
- White outline heart when not liked

### Database Structure
- Table: `video_likes`
- Fields:
  - `id` (UUID, primary key)
  - `video_id` (UUID, references video_library)
  - `user_id` (UUID, references auth.users) - for regular users
  - `artist_id` (UUID, references artists) - for artist accounts
  - `created_at` (timestamp)
- Constraints:
  - Either `user_id` OR `artist_id` must be set (not both)
  - Unique constraint prevents duplicate likes
- RLS Policies:
  - Users can view all likes
  - Users can only insert/delete their own likes

## Usage

1. **Double-tap** anywhere on the video to like
2. **Click** the heart icon in the stats to toggle like
3. Likes are stored per user and persist across sessions
