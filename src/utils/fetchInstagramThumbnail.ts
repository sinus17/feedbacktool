import { supabase } from '../lib/supabase';

/**
 * Fetches Instagram thumbnail using the dedicated Supabase Edge Function
 * 
 * @param instagramUrl The Instagram URL to fetch metadata for
 * @param creativeId Optional ID of the ad creative to update
 * @returns The thumbnail URL or null if not found
 */
export async function fetchInstagramThumbnail(instagramUrl: string, creativeId?: string | null): Promise<string | null> {
  try {
    if (!instagramUrl || !instagramUrl.includes('instagram.com')) {
      console.log('Not an Instagram URL, skipping thumbnail fetch:', instagramUrl);
      return null;
    }

    console.log('Fetching Instagram thumbnail via Edge Function for URL:', instagramUrl);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/fetch-instagram-thumbnail?url=${encodeURIComponent(instagramUrl)}${creativeId ? `&creativeId=${creativeId}` : ''}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching Instagram metadata:', errorText);
        return null;
      }

      const { thumbnailUrl, error } = await response.json();
      
      if (error) {
        console.error('Error from Instagram thumbnail function:', error);
        return null;
      }
      
      console.log('Instagram thumbnail fetched:', thumbnailUrl ? 'Success' : 'Not found');
      return thumbnailUrl;
    } catch (fetchError) {
      console.error('Network error fetching Instagram thumbnail:', fetchError);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Instagram thumbnail:', error);
    return null;
  }
}