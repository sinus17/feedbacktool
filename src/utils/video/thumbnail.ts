/**
 * Utility for generating video thumbnails
 */

import { supabase } from '../../lib/supabase';

/**
 * Generates a thumbnail from a video file and returns it as a data URL
 * 
 * @param videoFile The video file to generate a thumbnail from
 * @returns The data URL of the generated thumbnail
 */
/**
 * Generates a thumbnail from a video file and uploads it to Supabase storage
 * 
 * @param videoFile The video file to generate a thumbnail from
 * @returns The data URL of the generated thumbnail or null if generation fails
 */
export async function generateThumbnail(videoFile: File): Promise<string | null> {
  try {
    return new Promise((resolve, reject) => {
      try {
        // Create a video element to load the file
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // Create object URL for the video file
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Thumbnail generation timed out after 30 seconds'));
        }, 30000);
        
        // When video metadata is loaded, seek to the desired time
        video.onloadedmetadata = () => {
          // Seek to 1 second or 25% of the video, whichever is less
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
              
              resolve(dataUrl);
              
              // Clean up
              URL.revokeObjectURL(videoUrl);
            } catch (error) {
              console.error('Error creating thumbnail:', error);
              URL.revokeObjectURL(videoUrl);
              reject(error);
            }
          };
          
          // Handle errors during seeking
          video.onerror = (e) => {
            clearTimeout(timeout);
            console.error('Error during video seeking:', e);
            URL.revokeObjectURL(videoUrl);
            reject(new Error('Error generating thumbnail: video seeking failed'));
          };
        };
        
        // Handle errors during metadata loading
        video.onerror = (e) => {
          clearTimeout(timeout);
          console.error('Error loading video metadata:', e);
          URL.revokeObjectURL(videoUrl);
          reject(new Error('Error generating thumbnail: metadata loading failed'));
        };
      } catch (error) {
        console.error('Error in thumbnail generation:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
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
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', creativeId);
    
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

/**
 * Updates an ad creative with platform-specific thumbnail URLs
 * 
 * @param creativeId The ID of the ad creative to update
 * @param platform The platform (instagram or tiktok)
 * @param thumbnailUrl The URL of the thumbnail
 * @returns Whether the update was successful
 */
export async function updatePlatformThumbnail(
  creativeId: string, 
  platform: 'instagram' | 'tiktok', 
  thumbnailUrl: string
): Promise<boolean> {
  try {
    const updateField = platform === 'instagram' ? 'instagram_thumbnail_url' : 'tiktok_thumbnail_url';
    
    const { error } = await supabase
      .from('ad_creatives')
      .update({ [updateField]: thumbnailUrl })
      .eq('id', creativeId);
    
    if (error) {
      console.error(`Error updating ${platform} thumbnail:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error in updatePlatformThumbnail for ${platform}:`, error);
    return false;
  }
}