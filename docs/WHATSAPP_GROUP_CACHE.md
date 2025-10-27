# WhatsApp Group Members Cache System

## Overview
To speed up artist lookup by phone number, we've implemented a caching system that stores WhatsApp group members locally in the database instead of making slow API calls to WHAPI for every lookup.

## Architecture

### Database Table: `artist_whatsapp_group_members`

Stores cached WhatsApp group member information:

```sql
- id: UUID (primary key)
- artist_id: TEXT (references artists table)
- whatsapp_group_id: TEXT (group ID without @g.us)
- whatsapp_group_name: TEXT (human-readable group name)
- member_phone: TEXT (phone number without @ suffix)
- member_rank: TEXT ('creator', 'admin', 'member')
- last_synced_at: TIMESTAMP (when cache was last updated)
- sync_status: TEXT ('success', 'failed', 'pending')
- sync_error: TEXT (error message if sync failed)
```

**Indexes:**
- `idx_whatsapp_members_artist_id` - Fast lookup by artist
- `idx_whatsapp_members_phone` - Fast lookup by phone number
- `idx_whatsapp_members_group_id` - Fast lookup by group
- `idx_whatsapp_members_last_synced` - Track cache freshness

**Unique Constraint:** `(artist_id, member_phone)` - One entry per artist-member combination

## Edge Functions

### 1. `sync-whatsapp-group-members`

**Purpose:** Syncs WhatsApp group members from WHAPI to local cache

**Endpoint:** `POST /functions/v1/sync-whatsapp-group-members`

**Input:**
```json
{
  "artist_id": "optional-artist-id" // If provided, syncs only this artist
}
```

**Output:**
```json
{
  "success": true,
  "message": "Synced 50 artist groups successfully",
  "total_artists": 100,
  "success_count": 50,
  "fail_count": 50,
  "results": [
    {
      "artist_id": "uuid",
      "artist_name": "Artist Name",
      "status": "success",
      "members_synced": 5
    }
  ]
}
```

**Process:**
1. Fetches all artists with `whatsapp_group_id` (or specific artist if provided)
2. For each artist:
   - Calls WHAPI `GET /groups/{groupId}` to get participants
   - Deletes old cached entries for this artist
   - Inserts new cached entries with all group members
3. Returns sync results

**When to Call:**
- ✅ When a new artist is created with a WhatsApp group
- ✅ Periodically (e.g., daily cron job) to keep cache fresh
- ✅ When an artist's WhatsApp group ID is updated
- ✅ Manually via admin panel to refresh cache

### 2. `lookup-whatsapp-groups` (Updated)

**Purpose:** Fast lookup of artists by phone number using cached data

**Endpoint:** `POST /functions/v1/lookup-whatsapp-groups`

**Input:**
```json
{
  "phone": "+49 123 456 7890"
}
```

**Output:**
```json
{
  "success": true,
  "artists": [
    {
      "id": "artist-uuid",
      "name": "Artist Name",
      "whatsapp_group_id": "120363298754236172",
      "whatsapp_group_name": "Artist Group",
      "member_rank": "member"
    }
  ],
  "count": 1,
  "cached": true
}
```

**Process:**
1. Cleans and normalizes phone number
2. Creates phone number variations (with/without country code, etc.)
3. **Fast database query** to `artist_whatsapp_group_members` table
4. Returns matching artists instantly (no API calls!)

**Performance:**
- **Before:** 5-10 seconds (100+ API calls)
- **After:** <100ms (single database query)

## Usage

### Initial Sync (First Time Setup)

Sync all artist groups to populate the cache:

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/sync-whatsapp-group-members \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Sync Single Artist

When creating a new artist or updating their group:

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/sync-whatsapp-group-members \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"artist_id": "artist-uuid-here"}'
```

### Lookup Artists by Phone

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/lookup-whatsapp-groups \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+49 123 456 7890"}'
```

## Integration Points

### 1. Artist Creation/Update

When an artist is created or their `whatsapp_group_id` is updated, automatically sync their group members:

```typescript
// After creating/updating artist
await fetch(`${SUPABASE_URL}/functions/v1/sync-whatsapp-group-members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ artist_id: newArtist.id })
});
```

### 2. Campaign Submission Flow

The campaign submission already uses the fast lookup:

```typescript
// In NewCampaignSubmission.tsx
const lookupArtistsByWhatsAppGroups = async (phone: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-whatsapp-groups`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ phone })
    }
  );
  // ... handle response
};
```

### 3. Scheduled Sync (Recommended)

Set up a daily cron job to keep cache fresh:

```typescript
// Using Supabase Edge Functions with pg_cron or external scheduler
// Run daily at 2 AM
await fetch(`${SUPABASE_URL}/functions/v1/sync-whatsapp-group-members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});
```

## Cache Maintenance

### Cleanup Stale Entries

Remove cache entries older than 7 days:

```sql
SELECT cleanup_stale_whatsapp_cache();
```

### Check Cache Status

```sql
-- See cache statistics
SELECT 
  COUNT(*) as total_cached_members,
  COUNT(DISTINCT artist_id) as artists_with_cache,
  MAX(last_synced_at) as most_recent_sync,
  MIN(last_synced_at) as oldest_sync
FROM artist_whatsapp_group_members;

-- See artists without cached members
SELECT a.id, a.name, a.whatsapp_group_id
FROM artists a
LEFT JOIN artist_whatsapp_group_members m ON a.id = m.artist_id
WHERE a.whatsapp_group_id IS NOT NULL
AND m.id IS NULL;
```

### Manual Refresh

```sql
-- Delete all cache and re-sync
DELETE FROM artist_whatsapp_group_members;
-- Then call sync edge function
```

## Benefits

✅ **Speed**: 50-100x faster lookups (100ms vs 5-10 seconds)
✅ **Reliability**: No dependency on WHAPI availability during lookups
✅ **Cost**: Fewer API calls to WHAPI
✅ **Scalability**: Can handle many concurrent lookups
✅ **Offline**: Works even if WHAPI is temporarily down

## Limitations

⚠️ **Cache Staleness**: Members added/removed from WhatsApp groups won't be reflected until next sync
⚠️ **Storage**: Requires database space for cached members
⚠️ **Initial Sync**: First sync can take time for many artists

## Monitoring

Track sync health:

```sql
-- Failed syncs
SELECT artist_id, sync_error, last_synced_at
FROM artist_whatsapp_group_members
WHERE sync_status = 'failed'
ORDER BY last_synced_at DESC;

-- Stale cache (not synced in 24 hours)
SELECT DISTINCT artist_id, MAX(last_synced_at) as last_sync
FROM artist_whatsapp_group_members
GROUP BY artist_id
HAVING MAX(last_synced_at) < NOW() - INTERVAL '24 hours';
```
