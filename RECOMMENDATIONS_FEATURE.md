# Video Library Recommendations Feature

## Overview
This feature adds a collapsible recommendations section to the Library page that fetches trending TikTok ads from the "Culture & Art" category (last 7 days) and allows users to add them directly to their video library.

## Implementation Details

### 1. Database Table: `video_library_recommendations`
**Migration File:** `supabase/migrations/20251011000000_create_recommendations_table.sql`

- Duplicates the structure of `video_library` table
- Additional recommendation-specific fields:
  - `recommendation_source` - Source of recommendation (default: 'tiktok_ads_api')
  - `recommendation_period` - Period in days (7 for last 7 days)
  - `recommendation_country` - Country code (default: 'US')
  - `recommendation_industry` - Industry code (default: '23116000000' for Culture & Art)
  - `recommendation_ctr` - Click-through rate from ads API
  - `recommendation_cost` - Cost from ads API
  - `recommendation_fetched_at` - Timestamp when fetched

**Status:** ✅ Migration successfully applied to database

### 2. Component: `RecommendationsSection`
**File:** `src/components/library/RecommendationsSection.tsx`

**Features:**
- Collapsible section with expand/collapse toggle
- Fetches trending ads from TikTok Ads API on expand
- Displays ads in same grid layout as library videos
- Shows CTR (Click-Through Rate) and likes for each ad
- "Add to Library" button for each recommendation
- Visual feedback (loading spinner, checkmark when added)
- Error handling and retry functionality

**API Integration:**
```javascript
URL: https://tiktok-api23.p.rapidapi.com/api/trending/ads
Parameters:
  - page: 1
  - period: 7 (last 7 days)
  - limit: 50
  - country: US
  - order_by: ctr
  - like: 1
  - ad_format: 1
  - objective: 3
  - industry: 23116000000 (Culture & Art)
```

**Add to Library Flow:**
1. Constructs TikTok URL from video ID
2. Inserts into `video_library_queue` for processing
3. Stores metadata in `video_library_recommendations` for tracking
4. Shows success indicator (checkmark)

### 3. Library Page Integration
**File:** `src/pages/Library.tsx`

- Added import for `RecommendationsSection`
- Positioned below the video count, above the main video grid
- Only visible when NOT in public mode (`!isPublicMode`)

**Location in UI:**
```
[Hero Section with filters]
[Video count: "94 videos"]
[Recommendations Section] ← NEW
[Video Grid]
```

## User Flow

1. User navigates to Library page
2. Below the video count, sees "Recommended Ads (Culture & Art - Last 7 Days)" section (collapsed by default)
3. Clicks to expand the section
4. System fetches trending ads from TikTok API
5. Displays grid of recommended ads with thumbnails, titles, brand names, likes, and CTR
6. User clicks "+" button on any ad to add it to library
7. Video is queued for processing via existing video processing pipeline
8. Button shows checkmark to indicate it's been added
9. Video will appear in main library once processing completes

## Technical Notes

### TypeScript Type Assertions
Used `as any` type assertions for Supabase inserts due to TypeScript not recognizing the new `video_library_recommendations` table in the generated types. This is expected and safe - the table exists in the database.

### API Key Security ✅
**IMPLEMENTED:** Supabase Edge Function proxy
- API key is now stored server-side in the edge function
- Frontend calls `/functions/v1/fetch-tiktok-ads` instead of direct API
- Edge function deployed with `--no-verify-jwt` for public access
- No API key exposure in frontend code or network requests

### Caching
Recommendations are fetched fresh each time the section is expanded. Consider implementing:
- Cache recommendations for X minutes
- Refresh button to manually fetch new recommendations
- Background refresh on a schedule

### Future Enhancements
1. **Multiple Countries:** Add dropdown to select different countries
2. **Multiple Industries:** Allow filtering by different industry categories
3. **Time Period:** Add options for 1 day, 7 days, 30 days
4. **Sorting:** Allow sorting by CTR, likes, cost
5. **Pagination:** Load more recommendations beyond first 50
6. **Bulk Add:** Select multiple ads and add them all at once
7. **Preview:** Click to preview video before adding
8. **Filters:** Filter recommendations by brand, CTR range, etc.

## Testing Checklist

- [x] Migration creates table successfully
- [ ] Recommendations section appears on Library page
- [ ] Section expands/collapses correctly
- [ ] API fetches trending ads successfully
- [ ] Ads display in grid with correct information
- [ ] Add button queues video for processing
- [ ] Visual feedback works (spinner, checkmark)
- [ ] Error handling displays appropriately
- [ ] Section hidden in public mode
- [ ] Videos added from recommendations appear in library after processing

## Files Modified/Created

### Created:
1. `/supabase/migrations/20251011000000_create_recommendations_table.sql` - Database table
2. `/src/components/library/RecommendationsSection.tsx` - React component
3. `/supabase/functions/fetch-tiktok-ads/index.ts` - Edge function for API proxy

### Modified:
1. `/src/pages/Library.tsx` - Added import and component placement

### Deployed:
1. **Edge Function:** `fetch-tiktok-ads` - Deployed with `--no-verify-jwt`
2. **Database Table:** `video_library_recommendations` - Migrated successfully

## Database Schema

```sql
CREATE TABLE video_library_recommendations (
  -- All fields from video_library table
  -- Plus recommendation-specific fields:
  recommendation_source TEXT DEFAULT 'tiktok_ads_api',
  recommendation_period INTEGER DEFAULT 7,
  recommendation_country TEXT DEFAULT 'US',
  recommendation_industry TEXT DEFAULT '23116000000',
  recommendation_ctr DECIMAL(10, 6),
  recommendation_cost INTEGER,
  recommendation_fetched_at TIMESTAMPTZ DEFAULT NOW(),
  -- ... (see migration file for complete schema)
);
```

## API Response Structure

```typescript
interface TikTokAdsResponse {
  code: number;
  data: {
    materials: Array<{
      id: string;
      ad_title: string;
      brand_name: string;
      cost: number;
      ctr: number;
      like: number;
      video_info: {
        cover: string;
        duration: number;
        height: number;
        width: number;
        vid: string;
        video_url: {
          '720p'?: string;
          '1080p'?: string;
          '480p'?: string;
          '360p'?: string;
        };
      };
    }>;
    pagination: {
      has_more: boolean;
      page: number;
      size: number;
      total_count: number;
    };
  };
  msg: string;
}
```
