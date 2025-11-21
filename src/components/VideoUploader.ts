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

  constructor(options: VideoUploaderOptions) {
    this.options = options;
    this.abortController = new AbortController();
  }

  private calculateProgress(uploadedBytes: number, totalBytes: number): {
    progress: number;
    remainingTime: number;
    uploadSpeed: number;
  } {
    const progress = Math.min((uploadedBytes / totalBytes) * 100, 100);
    const elapsedTime = (Date.now() - this.startTime) / 1000; // in seconds
    const uploadSpeed = uploadedBytes / elapsedTime; // bytes per second
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingTime = remainingBytes / uploadSpeed; // in seconds

    return {
      progress,
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


  async uploadFile(file: File) {
    try {
      // Notify upload start
      this.options.onStart?.();

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please select a valid video file (MP4, WebM, or MOV).');
      }

      // Validate file size (300MB max)
      const maxSize = 300 * 1024 * 1024; // 300MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size must be less than 300MB. Current file: ${this.formatFileSize(file.size)}`);
      }

      console.log(`Starting upload: ${file.name} (${this.formatFileSize(file.size)})`);
      this.startTime = Date.now();

      // Generate a unique filename
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Create a more realistic progress simulation based on file size
      const fileSize = file.size;
      const chunkSize = Math.max(fileSize / 100, 1024 * 1024); // At least 1MB chunks
      let simulatedUploaded = 0;
      
      const progressInterval = setInterval(() => {
        // Simulate upload progress with variable speed (slower for larger files)
        const increment = Math.min(
          chunkSize * (0.5 + Math.random() * 0.5), // Random speed variation
          fileSize - simulatedUploaded
        );
        
        simulatedUploaded = Math.min(simulatedUploaded + increment, fileSize * 0.95); // Stop at 95%
        
        const { progress, remainingTime, uploadSpeed } = this.calculateProgress(simulatedUploaded, fileSize);
        this.options.onProgress?.(progress, remainingTime, uploadSpeed);
        
        if (simulatedUploaded >= fileSize * 0.95) {
          clearInterval(progressInterval);
        }
      }, 100); // Update every 100ms for smoother progress

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Set to 95% while generating thumbnail
      this.options.onProgress?.(95, 0, 0);

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

      // Set progress to 100% and notify completion
      this.options.onProgress?.(100, 0, 0);
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