import { supabase } from '../lib/supabase';
import { generateThumbnail } from '../utils/video/thumbnail';

interface VideoUploaderOptions {
  onStart?: () => void;
  onProgress?: (progress: number, remainingTime?: number, uploadSpeed?: number) => void;
  onUploadComplete: (url: string) => void;
  onError: (error: string) => void;
}

export class VideoUploader {
  private options: VideoUploaderOptions;
  private abortController: AbortController;
  private startTime: number = 0;
  private lastProgressTime: number = 0;
  private lastUploadedBytes: number = 0;

  constructor(options: VideoUploaderOptions) {
    this.options = options;
    this.abortController = new AbortController();
  }

  private calculateProgress(progress: number, totalBytes: number): {
    progress: number;
    remainingTime: number;
    uploadSpeed: number;
  } {
    const now = Date.now();
    const elapsedTime = (now - this.startTime) / 1000; // in seconds
    const uploadedBytes = (progress / 100) * totalBytes;
    
    // Calculate instantaneous speed using recent progress
    let uploadSpeed = 0;
    if (this.lastProgressTime > 0) {
      const timeDelta = (now - this.lastProgressTime) / 1000;
      const bytesDelta = uploadedBytes - this.lastUploadedBytes;
      if (timeDelta > 0) {
        uploadSpeed = bytesDelta / timeDelta;
      }
    }
    
    // Fallback to average speed if instantaneous speed is not available
    if (uploadSpeed <= 0 && elapsedTime > 0) {
      uploadSpeed = uploadedBytes / elapsedTime;
    }
    
    // Update tracking variables
    this.lastProgressTime = now;
    this.lastUploadedBytes = uploadedBytes;
    
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingTime = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

    return {
      progress: Math.min(progress, 100),
      remainingTime: isFinite(remainingTime) ? remainingTime : 0,
      uploadSpeed
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  async upload(file: File) {
    try {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please select a valid video file (MP4, WebM, or MOV).');
      }

      console.log(`Starting upload: ${file.name} (${this.formatFileSize(file.size)})`);
      this.startTime = Date.now();
      this.lastProgressTime = 0;
      this.lastUploadedBytes = 0;

      // Generate a unique filename
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Start with initial progress
      this.options.onProgress?.(0);

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
          abortSignal: this.abortController.signal,
          duplex: 'half'
        });

      if (uploadError) {
        // Handle specific Supabase storage errors
        if (uploadError.message.includes('exceeded the maximum allowed size') || 
            uploadError.message.includes('Payload too large') ||
            uploadError.message.includes('413')) {
          throw new Error(`File is too large for upload. Your file: ${this.formatFileSize(file.size)}. This limit is set on the Supabase server. Please try compressing the video or increase the file size limit in your Supabase project's storage settings.`);
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Simulate progress since Supabase doesn't provide real progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15; // Random increment between 0-15%
        if (progress >= 95) {
          progress = 95; // Cap at 95% until upload completes
        }
        
        const { progress: calculatedProgress, remainingTime, uploadSpeed } = this.calculateProgress(progress, file.size);
        this.options.onProgress?.(calculatedProgress, remainingTime, uploadSpeed);
      }, 200);

      // Clear interval and set to 100% when upload completes
      clearInterval(progressInterval);
      this.options.onProgress?.(100, 0, 0);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);
      
      // Generate thumbnail
      try {
        console.log('Generating thumbnail for uploaded video...');
        const thumbnailUrl = await generateThumbnail(file);
        console.log('Generated thumbnail:', thumbnailUrl ? 'Success' : 'Failed');
      } catch (thumbnailError) {
        console.error('Failed to generate thumbnail:', thumbnailError);
      }

      this.options.onUploadComplete(publicUrl);

    } catch (error) {
      console.error('Upload error:', error);
      this.options.onError(error instanceof Error ? error.message : 'Failed to upload video');
    }
  }

  abort() {
    this.abortController.abort();
  }
}