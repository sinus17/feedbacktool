export interface PlaceholderItem {
  label: string;
  value: string;
  description?: string;
}

export const PLACEHOLDER_ITEMS: PlaceholderItem[] = [
  // Releases table
  { label: 'releases/name', value: '$releases/name$', description: 'Release name' },
  { label: 'releases/release_date', value: '$releases/release_date$', description: 'Release date' },
  { label: 'releases/spotify_url', value: '$releases/spotify_url$', description: 'Spotify URL' },
  { label: 'releases/master_file_url', value: '$releases/master_file_url$', description: 'Master file URL' },
  
  // Artists table
  { label: 'artists/name', value: '$artists/name$', description: 'Artist name' },
  { label: 'artists/instagram_url', value: '$artists/instagram_url$', description: 'Instagram URL' },
  { label: 'artists/tiktok_url', value: '$artists/tiktok_url$', description: 'TikTok URL' },
  { label: 'artists/spotify_url', value: '$artists/spotify_url$', description: 'Spotify URL' },
];

// Simple placeholder autocomplete - just exports the items
// The actual autocomplete integration would require @tiptap/suggestion
// which has version conflicts with Novel

// For now, placeholders can be typed manually: $table/column$
