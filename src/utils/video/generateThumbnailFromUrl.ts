import { supabase } from '../../lib/supabase';

/**
 * Generates a thumbnail from a Supabase storage video URL and returns it as a data URL
 * 
 * @param videoUrl The URL of the video to generate a thumbnail from
 * @returns The data URL of the generated thumbnail
 */
/**
 * Generates a thumbnail from a Supabase storage video URL
 * 
 * @param videoUrl The URL of the video to generate a thumbnail from
 * @returns The data URL of the generated thumbnail
 */
export async function generateThumbnailFromUrl(videoUrl: string): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    try {
      // Only generate thumbnails for Supabase storage URLs or Dropbox direct download URLs
      const isDropboxDirect = videoUrl.includes('dropbox.com') && videoUrl.includes('dl=1');
      if (!videoUrl || (!isSupabaseStorageUrl(videoUrl) && !isDropboxDirect)) {
        console.log('Skipping thumbnail generation - not a Supabase storage URL or Dropbox direct link:', videoUrl);
        resolve(null);
        return;
      }
      
      console.log('Starting thumbnail generation for URL:', videoUrl);
      // Create a video element to load the URL
      const video = document.createElement('video');
      // Only set crossOrigin for Supabase URLs to avoid CORS issues with Dropbox
      if (isSupabaseStorageUrl(videoUrl)) {
        video.crossOrigin = 'anonymous';
      }
      video.preload = 'metadata';
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Thumbnail generation timed out after 30 seconds'));
      }, 30000);
      
      // Set up event handlers
      video.onloadedmetadata = () => {
        // Seek to 1 second or 25% of the video, whichever is less
        console.log('Video metadata loaded, duration:', video.duration);
        const seekTime = Math.min(1, video.duration * 0.25);
        
        try {
          video.currentTime = seekTime;
        } catch (seekError) {
          console.error('Error seeking video:', seekError);
          // Try to continue anyway
        }
        
        // When the frame at the seek time is loaded
        video.onseeked = async () => {
          clearTimeout(timeout);
          console.log('Video seeked to frame, generating thumbnail');
          try {
            // Create a canvas with 9:16 aspect ratio
            const canvas = document.createElement('canvas');
            // Set fixed dimensions with 9:16 aspect ratio
            canvas.width = 270;   // Width: 270px
            canvas.height = 480;  // Height: 480px (9:16 ratio)
            const aspectRatio = canvas.width / canvas.height;
            
            // Calculate dimensions to crop from the video
            let sourceWidth, sourceHeight, sourceX, sourceY;
            const videoAspect = video.videoWidth / video.videoHeight;
            
            if (videoAspect > aspectRatio) {
              // Video is wider than 9:16, crop the sides
              sourceHeight = video.videoHeight;
              sourceWidth = sourceHeight * aspectRatio;
              sourceX = (video.videoWidth - sourceWidth) / 2;
              sourceY = 0;
            } else {
              // Video is taller than 9:16, crop top/bottom
              sourceWidth = video.videoWidth;
              sourceHeight = sourceWidth / aspectRatio;
              sourceX = 0;
              sourceY = (video.videoHeight - sourceHeight) / 2;
            }
            
            // Draw the video frame to the canvas
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas 2D context');
            }
            
            // Draw the video frame to the canvas, cropping to center
            ctx.drawImage(
              video,
              sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
              0, 0, canvas.width, canvas.height           // Destination rectangle
            );
            
            // Convert the canvas to a data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            console.log('Thumbnail generated successfully');
            resolve(dataUrl);
          } catch (error) {
            console.error('Error creating thumbnail:', error);
            clearTimeout(timeout);
            reject(error);
          }
        };
        
        // Handle errors during seeking
        video.onerror = (e) => {
          console.error('Error during video seeking:', e);
          reject(new Error('Error generating thumbnail: video seeking failed'));
        };
      };
      
      // Handle errors during metadata loading
      video.onerror = (e) => {
        console.error('Error loading video metadata:', e, video.error);
        clearTimeout(timeout);
        reject(new Error('Error generating thumbnail: metadata loading failed'));
      };
      
      // Set the video source
      video.src = videoUrl;
      console.log('Video source set to:', videoUrl, 'waiting for metadata');
      
    } catch (error) {
      console.error('Error in thumbnail generation:', error);
      reject(error);
    }
  }).catch(error => {
    console.error('Thumbnail generation failed:', error);
    return null;
  });
}

// Helper function to check if a URL is a Supabase storage URL
function isSupabaseStorageUrl(url: string): boolean {
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

/**
 * Updates an ad creative with a thumbnail URL
 * 
 * @param creativeId The ID of the ad creative to update
 * @param thumbnailUrl The URL of the thumbnail
 * @returns Whether the update was successful
 */
export async function updateAdCreativeThumbnail(creativeId: string, thumbnailUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ad_creatives')
      .update({ 
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id' as any, creativeId as any);
    
    if (error) {
      console.error('Error updating ad creative thumbnail:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateAdCreativeThumbnail:', error);
    return false;
  }
}