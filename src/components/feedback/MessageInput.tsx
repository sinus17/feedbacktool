import React, { useRef, useState } from 'react';
import { Send, Upload, Check, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoUploader } from '../VideoUploader';

interface MessageInputProps {
  isArtistView: boolean;
  message: string;
  notes?: string;
  onChange: (value: string) => void;
  onNotesChange?: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onMarkAsReady?: () => void;
  showMarkAsReady?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  isArtistView,
  message,
  notes,
  onChange,
  onNotesChange,
  onSubmit,
  isSubmitting,
  onMarkAsReady,
  showMarkAsReady,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    remainingTime: number;
    uploadSpeed: number;
    fileSize: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Check if form can be submitted
  const canSubmit = !isSubmitting && !isUploading && (
    isArtistView 
      ? (Boolean(notes?.trim()) || Boolean(message.trim())) // Artist can submit either notes or video URL
      : Boolean(message.trim()) // Admin must provide feedback text
  );

  const validateInput = (value: string): boolean => {
    // Reset error state
    setInputError(null);
    
    // Check for Instagram reel URLs
    if (value.includes('instagram.com') && 
        (value.includes('/reel/') || value.includes('/p/'))) {
      setInputError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
      return false;
    }
    
    // Check for TikTok auth codes
    if (value.trim().startsWith('#')) {
      setInputError('TikTok auth codes should be submitted in the Ad Creatives section, not here.');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange(value);
    validateInput(value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onNotesChange) {
      onNotesChange(e.target.value);
      validateInput(e.target.value);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadStats({
        remainingTime: 0,
        uploadSpeed: 0,
        fileSize: formatFileSize(file.size)
      });

      const uploader = new VideoUploader({
        onStart: () => {
          setUploadProgress(0);
        },
        onProgress: (progress, remainingTime = 0, uploadSpeed = 0) => {
          setUploadProgress(progress);
          setUploadStats(prev => prev ? {
            ...prev,
            remainingTime,
            uploadSpeed
          } : null);
        },
        onUploadComplete: (url) => {
          onChange(url);
          setIsUploading(false);
          setUploadStats(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        onError: (error) => {
          setUploadError(error);
          setIsUploading(false);
          setUploadStats(null);
        }
      });

      await uploader.uploadFile(file);
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload video');
      setIsUploading(false);
      setUploadStats(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col space-y-2">
      {isArtistView ? (
        <>
          <div className="flex gap-2">
            <div className="flex-1 relative mb-2">
              <input
                type="url"
                value={message}
                onChange={handleInputChange}
                placeholder="Enter video URL or upload a file (optional)"
                className="w-full rounded-lg border-gray-700 bg-gray-800 text-white p-2.5"
                disabled={isSubmitting || isUploading}
              />
              <AnimatePresence>
                {isUploading && (
                  <motion.div 
                    className="absolute bottom-0 left-0 h-0.5 bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
            </div>
            <motion.button
              type="button"
              onClick={handleFileSelect}
              className={`px-3 rounded-lg border border-gray-700 bg-gray-800 text-white transition-colors ${
                isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
              }`}
              disabled={isSubmitting || isUploading}
              whileHover={!isUploading ? { scale: 1.05 } : {}}
              whileTap={!isUploading ? { scale: 0.95 } : {}}
            >
              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center"
                  >
                    <div className="flex items-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Upload className="h-5 w-5" />
                      </motion.div>
                      <span className="ml-2">{Math.round(uploadProgress)}%</span>
                    </div>
                    {uploadStats && (
                      <div className="text-xs text-gray-400 mt-1 text-center">
                        <div>{uploadStats.fileSize}</div>
                        {uploadStats.remainingTime > 0 && (
                          <div>{formatTime(uploadStats.remainingTime)} left</div>
                        )}
                        {uploadStats.uploadSpeed > 0 && (
                          <div>{formatSpeed(uploadStats.uploadSpeed)}</div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Upload className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {uploadError && (
            <motion.div
              className="text-sm text-red-500"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {uploadError}
            </motion.div>
          )}
          {inputError && (
            <motion.div
              className="text-sm text-red-500"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {inputError}
            </motion.div>
          )}
          {onNotesChange && (
            <textarea
              value={notes || ''}
              onChange={handleNotesChange}
              placeholder="Add notes or feedback..."
              className="flex-1 min-h-[60px] max-h-24 rounded-lg border-gray-700 bg-gray-800 text-white resize-none p-2.5"
              disabled={isSubmitting}
            />
          )}
        </>
      ) : (
        <textarea
          value={message}
          onChange={handleInputChange}
          placeholder="Add notes or feedback..."
          className="flex-1 min-h-[100px] max-h-32 rounded-lg border-gray-700 bg-gray-800 text-white resize-none p-2.5"
          disabled={isSubmitting}
        />
      )}
      
      {inputError && !isArtistView && (
        <motion.div
          className="text-sm text-red-500"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          {inputError}
        </motion.div>
      )}

      <div className="flex justify-end gap-2">
        <motion.button
          type="submit"
          disabled={isSubmitting || !canSubmit || !!inputError}
          className="btn p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isSubmitting ? (
            <span>Sending...</span>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {isArtistView ? 'Update' : 'Send Feedback'}
            </>
          )}
        </motion.button>

        {showMarkAsReady && (
          <motion.button
            type="button"
            onClick={onMarkAsReady}
            disabled={isSubmitting} 
            className="btn p-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? (
              <span>Processing...</span>
            ) : (
              <>Mark as Ready</>
            )}
          </motion.button>
        )}
      </div>
    </form>
  );
};