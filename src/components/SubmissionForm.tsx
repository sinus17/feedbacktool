import React, { useState, useRef } from 'react';
import { Send, X, Loader, Upload } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoUploader } from './VideoUploader';

interface SubmissionFormProps {
  onClose: () => void;
  artistId?: string;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({ onClose, artistId }) => {
  const { addSubmission, artists } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    remainingTime: number;
    uploadSpeed: number;
    fileSize: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    projectName: '',
    videoUrl: '',
    type: 'song-specific' as const,
    artistId: artistId || '',
    notes: '',
    status: 'new' as const
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  const validateForm = () => {
    if (!formData.projectName.trim()) {
      setError('Please enter a project name');
      return false;
    }

    // Check for Instagram reel URLs
    if (formData.videoUrl.includes('instagram.com') && 
        (formData.videoUrl.includes('/reel/') || formData.videoUrl.includes('/p/'))) {
      setError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
      return false;
    }
    
    // Check for TikTok auth codes
    if (formData.videoUrl.trim().startsWith('#')) {
      setError('TikTok auth codes should be submitted in the Ad Creatives section, not here.');
      return false;
    }

    // Check for Instagram reel URLs
    if (formData.videoUrl.includes('instagram.com') && 
        (formData.videoUrl.includes('/reel/') || formData.videoUrl.includes('/p/'))) {
      setError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
      return false;
    }
    
    // Check for TikTok auth codes
    if (formData.videoUrl.trim().startsWith('#')) {
      setError('TikTok auth codes should be submitted in the Ad Creatives section, not here.');
      return false;
    }

    if (!formData.videoUrl.trim()) {
      setError('Please provide a video URL or upload a video');
      return false;
    }

    // Check for Instagram reel URLs or TikTok auth codes in notes
    if (formData.notes) {
      if (formData.notes.includes('instagram.com') && 
          (formData.notes.includes('/reel/') || formData.notes.includes('/p/'))) {
        setError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
        return false;
      }
      
      if (formData.notes.trim().startsWith('#')) {
        setError('TikTok auth codes should be submitted in the Ad Creatives section, not here.');
        return false;
      }
    }

    if (!formData.artistId) {
      setError('Please select an artist');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading || isUploading) return;
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      await addSubmission({
        ...formData,
        artistId: artistId || formData.artistId,
        status: 'new'
      }).catch(error => {
        console.error('Error in submission form:', error);
        throw error;
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting video:', error);
      if (error instanceof Error) {
        if (error.message === 'duplicate_entry') {
          setError('This video URL has already been submitted. Please check your submissions or use a different URL.');
        } else if (error.message === 'duplicate_submission_id') {
          setError('A submission with this ID already exists. Please try again.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to submit video');
      }
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
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
          setFormData(prev => ({ ...prev, videoUrl: url }));
          setIsUploading(false);
          setUploadStats(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        onError: (error) => {
          setError(error);
          setIsUploading(false);
          setUploadStats(null);
        }
      });

      await uploader.uploadFile(file);
    } catch (error) {
      console.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload video');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        className="bg-white dark:bg-[#1F2937] rounded-lg max-w-2xl w-full p-6"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Submit New Video</h2>
          <motion.button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Video Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter video name"
              disabled={loading || isUploading}
            />
          </motion.div>

          {!artistId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-sm font-medium mb-1 dark:text-white">
                Artist <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.artistId}
                onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                disabled={loading || isUploading}
              >
                <option value="">Select an artist</option>
                {activeArtists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="song-specific"
                  checked={formData.type === 'song-specific'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'song-specific' | 'off-topic',
                    })
                  }
                  className="mr-2"
                  disabled={loading || isUploading}
                />
                <span className="dark:text-white">Song Specific</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="off-topic"
                  checked={formData.type === 'off-topic'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'song-specific' | 'off-topic',
                    })
                  }
                  className="mr-2"
                  disabled={loading || isUploading}
                />
                <span className="dark:text-white">Off Topic</span>
              </label>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Video <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="flex-1 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter video URL or upload a file"
                disabled={loading || isUploading}
              />
              <motion.button
                type="button"
                onClick={handleFileSelect}
                className={`px-3 rounded-md border border-gray-300 dark:border-gray-600 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={loading || isUploading}
                whileHover={!isUploading ? { scale: 1.05 } : {}}
                whileTap={!isUploading ? { scale: 0.95 } : {}}
              >
                <AnimatePresence mode="wait">
                  {isUploading ? (
                    <motion.div
                      key="uploading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
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
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          <div>{uploadStats.fileSize}</div>
                          {uploadStats.remainingTime > 0 && (
                            <div>{formatTime(uploadStats.remainingTime)} remaining</div>
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Upload className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes or comments about this submission..."
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white h-32 resize-none"
              disabled={loading || isUploading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              These notes will be visible in the feedback conversation.
            </p>
          </motion.div>

          <motion.div 
            className="flex justify-end space-x-2 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={loading || isUploading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button 
              type="submit" 
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isUploading}
              whileHover={!loading && !isUploading ? { scale: 1.05 } : {}}
              whileTap={!loading && !isUploading ? { scale: 0.95 } : {}}
            >
              {loading || isUploading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Video
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};