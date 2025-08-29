import React, { useState } from 'react';
import { X, AlertCircle, Loader } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import type { VideoSubmission } from '../types';

interface EditVideoModalProps {
  submission: VideoSubmission;
  onClose: () => void;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({ submission, onClose }) => {
  const { updateSubmission } = useStore();
  const [formData, setFormData] = useState({
    projectName: submission.projectName || '',
    videoUrl: submission.videoUrl || '',
    type: submission.type,
    status: submission.status,
    skipNotification: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isArtistView = window.location.pathname.startsWith('/artist/');

  const validateForm = () => {
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return false;
    }

    if (!formData.videoUrl.trim()) {
      setError('Video URL is required');
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

    // Check if anything has actually changed
    const hasChanges = 
      formData.projectName.trim() !== submission.projectName ||
      formData.videoUrl.trim() !== submission.videoUrl ||
      formData.type !== submission.type ||
      formData.status !== submission.status;

    if (!hasChanges) {
      setError('No changes were made');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Only include fields that have changed to minimize update operations
      const updates: Partial<VideoSubmission> = {};
      
      if (formData.projectName.trim() !== submission.projectName) {
        updates.projectName = formData.projectName.trim();
      }
      
      if (formData.videoUrl.trim() !== submission.videoUrl) {
        updates.videoUrl = formData.videoUrl.trim();
      }
      
      if (formData.type !== submission.type) {
        updates.type = formData.type;
      }

      if (formData.status !== submission.status) {
        updates.status = formData.status;
      }

      // Pass skipNotification flag to updateSubmission
      const { success, error: updateError } = await updateSubmission(
        submission.id.toString(),
        updates,
        formData.skipNotification,
        true   // Flag to indicate this is a video URL update from artist
      );

      if (!success || updateError) {
        throw updateError || new Error('Failed to update video');
      }

      onClose();
    } catch (err) {
      console.error('Error updating video:', err);
      setError(err instanceof Error ? err.message : 'Failed to update video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        duration: 0.5,
        bounce: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Edit Video</h2>
          <motion.button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div 
                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter project name"
              disabled={loading}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Video URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.videoUrl}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter video URL"
              disabled={loading}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="song-specific"
                  checked={formData.type === 'song-specific'}
                  onChange={(e) => handleInputChange('type', e.target.value as 'song-specific' | 'off-topic')}
                  className="mr-2"
                  disabled={loading}
                />
                <span className="dark:text-white">Song Specific</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="off-topic"
                  checked={formData.type === 'off-topic'}
                  onChange={(e) => handleInputChange('type', e.target.value as 'song-specific' | 'off-topic')}
                  className="mr-2"
                  disabled={loading}
                />
                <span className="dark:text-white">Off Topic</span>
              </label>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-white">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={loading}
            >
              <option value="new">New</option>
              <option value="feedback-needed">Feedback Needed</option>
              <option value="correction-needed">Correction Needed</option>
              <option value="ready">Ready</option>
              <option value="planned">Planned</option>
              <option value="posted">Posted</option>
            </select>
          </motion.div>

          <motion.div 
            className="flex items-center mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <input
              type="checkbox"
              id="skipNotification"
              checked={formData.skipNotification}
              onChange={(e) => handleInputChange('skipNotification', e.target.checked)}
              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              disabled={loading}
            />
            <label htmlFor="skipNotification" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
              Skip WhatsApp notification when changing status
            </label>
          </motion.div>

          <motion.div 
            className="flex justify-end space-x-2 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <motion.button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              whileHover={!loading ? { scale: 1.05 } : {}}
              whileTap={!loading ? { scale: 0.95 } : {}}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Video'
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};