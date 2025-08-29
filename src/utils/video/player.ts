/**
 * Video player utilities and error handling
 */

import { supabase } from '../../lib/supabase';

export interface VideoError {
  code: number;
  message: string;
}

export function processVideoUrl(url: string): string {
  try {
    // For Dropbox URLs, add dl=1 parameter
    if (url.includes('dropbox.com')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('dl', '1');
      return urlObj.toString();
    }

    return url; // Return unmodified for other URLs
  } catch (err) {
    console.error('Error processing video URL:', err);
    return url;
  }
}

export function isSupabaseStorageUrl(url: string): boolean {
  // Return false early if the input is not a valid URL format
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Quick check for common non-URL patterns to avoid URL constructor errors
  if (!url.includes('://') || url.length < 10) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    const result = (
      (urlObj.hostname.includes('supabase.co') && 
       urlObj.pathname.includes('/storage/v1/object/public/')) ||
      urlObj.hostname.includes('supabase.in') ||
      urlObj.hostname.includes('storage.googleapis.com')
    );
    return result;
  } catch (error) {
    return false;
  }
}

export function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle different Supabase storage URL formats
    if (urlObj.pathname.includes('/storage/v1/object/public/')) {
      // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        const [, bucket, path] = match;
        return `${bucket}/${path}`;
      }
    } else if (urlObj.hostname.includes('storage.googleapis.com')) {
      // Format: https://storage.googleapis.com/<project>/storage/v1/object/public/<bucket>/<path>
      const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        const [, bucket, path] = match;
        return `${bucket}/${path}`;
      }
    }
    
    console.error('Could not extract storage path from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}

export function getVideoErrorMessage(error: VideoError): string {
  // Check for format error in the message string first
  if (error.message && error.message.toLowerCase().includes('format error')) {
    return 'This video format is not supported by your browser. Please try converting the video to MP4 or WebM format, or use a different browser.';
  }

  switch (error.code) {
    case 1: // MEDIA_ERR_ABORTED
      return 'The video playback was aborted. Please try again.';
    case 2: // MEDIA_ERR_NETWORK
      return 'A network error occurred while loading the video. Please check your connection and ensure the video is accessible.';
    case 3: // MEDIA_ERR_DECODE
      return 'The video format is not supported or the file is corrupted. Some browsers may have issues with MOV files. If you experience problems, try converting the video to MP4 or WebM format.';
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return 'This video format is not supported by your browser. Please try using a different browser or convert the video to MP4 or WebM format.';
    default:
      return 'An error occurred while playing the video. Please check that the video URL is valid and try again.';
  }
}

export function getVideoLoadingMessage(state: number): string {
  switch (state) {
    case 0: // HAVE_NOTHING
      return 'No video data is available';
    case 1: // HAVE_METADATA
      return 'Video metadata is loading';
    case 2: // HAVE_CURRENT_DATA
      return 'Video data is available for the current playback position';
    case 3: // HAVE_FUTURE_DATA
      return 'Video data is available for the current and future playback';
    case 4: // HAVE_ENOUGH_DATA
      return 'All video data is loaded';
    default:
      return 'Loading video...';
  }
}

export function formatVideoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getDownloadUrl(url: string): string {
  try {
    // For Dropbox URLs, add dl=1 parameter
    if (url.includes('dropbox.com')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('dl', '1');
      return urlObj.toString();
    }

    return url; // Return unmodified for other URLs
  } catch (error) {
    console.error('Error processing download URL:', error);
    return url;
  }
}

export async function deleteVideoFromStorage(url: string): Promise<boolean> {
  try {
    if (!url) {
      console.error('No URL provided for deletion');
      return false;
    }

    if (!isSupabaseStorageUrl(url)) {
      console.log('Not a Supabase storage URL, skipping deletion:', url);
      return false;
    }
    
    const path = extractStoragePath(url);
    if (!path) {
      console.error('Could not extract storage path from URL:', url);
      return false;
    }
    
    // Split path into bucket and file path
    const [bucket, ...fileParts] = path.split('/');
    const filePath = fileParts.join('/');
    
    console.log('Deleting file from storage:', { bucket, filePath, url });
    
    // Delete the file from storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('Storage deletion error:', error);
      return false;
    }
    
    console.log('Successfully deleted file from storage:', data);
    return true;
  } catch (error) {
    console.error('Error deleting video from storage:', error);
    return false;
  }
}