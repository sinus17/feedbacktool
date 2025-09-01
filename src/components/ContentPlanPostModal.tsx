import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader, Calendar, Download, Search, ChevronDown } from 'lucide-react';
import { useContentPlanStore, ContentPlanPost } from '../store/contentPlanStore';
import { useStore } from '../store';
import { VideoPlayer } from './VideoPlayer';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { VideoSubmission } from '../types';

interface ContentPlanPostModalProps {
  post?: ContentPlanPost | null;
  artistId?: string;
  onClose: () => void;
}

export const ContentPlanPostModal: React.FC<ContentPlanPostModalProps> = ({ 
  post, 
  artistId, 
  onClose 
}) => {
  const { addPost, updatePost, deletePost, selectedDate, getReadySubmissions } = useContentPlanStore();
  const { artists } = useStore();
  
  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  const [formData, setFormData] = useState({
    title: '',
    start: new Date(),
    end: new Date(),
    allDay: true,
    resourceId: artistId || '',
    submissionId: '',
    status: 'posted' as const,
    type: 'song-specific' as const,
    videoUrl: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [readySubmissions, setReadySubmissions] = useState<VideoSubmission[]>([]);
  const [resetStatusOnDelete, setResetStatusOnDelete] = useState(true);
  
  // Search functionality for video selection
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Filter submissions based on search term
  const filteredSubmissions = readySubmissions.filter(submission =>
    submission.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Initialize form data from post or selected date
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        start: new Date(post.start),
        end: new Date(post.end),
        allDay: true,
        resourceId: post.resourceId || '',
        submissionId: post.submissionId || '',
        status: post.status,
        type: post.type,
        videoUrl: post.videoUrl || '',
        notes: post.notes || ''
      });
    } else {
      // Use selected date or current date
      const start = selectedDate || new Date();
      const end = new Date(start);
      end.setHours(23, 59, 59);
      
      setFormData(prev => ({
        ...prev,
        start,
        end,
        resourceId: artistId || prev.resourceId
      }));
    }
  }, [post, selectedDate, artistId]);
  
  // Fetch ready submissions when artist changes
  useEffect(() => {
    const fetchReadySubmissions = async () => {
      if (formData.resourceId) {
        const submissions = await getReadySubmissions(formData.resourceId);
        setReadySubmissions(submissions);
      } else {
        setReadySubmissions([]);
      }
    };
    
    fetchReadySubmissions();
  }, [formData.resourceId, getReadySubmissions]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.submissionId) {
      setError('Please select a video');
      return;
    }
    
    if (!formData.resourceId) {
      setError('Artist is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (post) {
        await updatePost(post.id, formData);
      } else {
        await addPost({
          ...formData,
          submissionId: formData.submissionId
        });
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving post:', err);
      setError(err instanceof Error ? err.message : 'Failed to save post');
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!post) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await deletePost(post.id, resetStatusOnDelete);
      onClose();
    } catch (err) {
      console.error('Error removing post:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove post');
      setLoading(false);
    }
  };
  
  const handleRemoveFromContentPlan = async () => {
    if (!post) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Delete the content plan post and reset the submission status to ready
      await deletePost(post.id, true);
      onClose();
    } catch (err) {
      console.error('Error removing post from content plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove post from content plan');
      setLoading(false);
    }
  };
  
  const handleSubmissionChange = (submissionId: string) => {
    const submission = readySubmissions.find(s => s.id.toString() === submissionId);
    if (submission) {
      setFormData({
        ...formData,
        submissionId,
        title: submission.projectName,
        type: submission.type,
        videoUrl: submission.videoUrl
      });
      setSearchTerm(submission.projectName);
      setIsDropdownOpen(false);
    }
  };
  
  const handleDownload = () => {
    if (!formData.videoUrl) return;
    
    try {
      const url = new URL(formData.videoUrl);
      url.searchParams.set('dl', '1');
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error processing video URL:', error);
      window.open(formData.videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  const confirmVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } }
  };
  
  // Searchable Video Select Component
  const SearchableVideoSelect: React.FC<{
    submissions: VideoSubmission[];
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    placeholder: string;
  }> = ({ submissions, value, onChange, disabled, placeholder }) => {
    const selectedSubmission = submissions.find(s => s.id.toString() === value);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setIsDropdownOpen(true);
      
      // Clear selection if user is typing and it doesn't match
      if (value && selectedSubmission && newValue !== selectedSubmission.projectName) {
        onChange('');
      }
    };
    
    const handleSubmissionSelect = (submissionId: string) => {
      const submission = submissions.find(s => s.id.toString() === submissionId);
      if (submission) {
        onChange(submissionId);
        setSearchTerm(submission.projectName);
        setIsDropdownOpen(false);
        
        // Update form data
        setFormData(prev => ({
          ...prev,
          submissionId,
          title: submission.projectName,
          type: submission.type,
          videoUrl: submission.videoUrl
        }));
      }
    };

    
    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        <AnimatePresence>
          {isDropdownOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredSubmissions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No videos match your search' : 'No ready videos available'}
                </div>
              ) : (
                filteredSubmissions.map((submission) => (
                  <motion.button
                    key={submission.id}
                    type="button"
                    onClick={() => handleSubmissionSelect(submission.id.toString())}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      value === submission.id.toString() 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}
                    whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{submission.projectName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        submission.type === 'song-specific'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300'
                      }`}>
                        {submission.type === 'song-specific' ? 'Song' : 'Off-Topic'}
                      </span>
                    </div>
                    {submission.notes && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {submission.notes}
                      </div>
                    )}
                  </motion.button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div 
            className="fixed inset-0 z-5"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg w-[90vw] max-w-4xl p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">
            {post ? 'Edit Post' : 'Add New Post'}
          </h2>
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
              className="mb-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex gap-6">
          {/* Left column - Video preview */}
          <div className="w-[30%] flex-shrink-0">
            {formData.submissionId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="space-y-4"
              >
                <label className="block text-sm font-medium mb-2 dark:text-white">
                  Video Preview
                </label>
                <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                  <VideoPlayer
                    key={formData.videoUrl}
                    url={formData.videoUrl}
                    isDesktop={true}
                  />
                </div>
             </motion.div>
           )}
          </div>

          {/* Right column - Form fields */}
          <div className="w-[70%] space-y-4">
            {!artistId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium mb-1 dark:text-white">
                  Artist <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.resourceId}
                  onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                  disabled={loading || !!post}
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
           
            {!post && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <label className="block text-sm font-medium mb-1 dark:text-white">
                  Select Ready Video <span className="text-red-500">*</span>
                </label>
                <SearchableVideoSelect
                  submissions={readySubmissions}
                  value={formData.submissionId}
                  onChange={(submissionId) => handleSubmissionChange(submissionId)}
                  disabled={loading || readySubmissions.length === 0}
                  placeholder="Search and select a video..."
                />
                {readySubmissions.length === 0 && formData.resourceId && (
                  <p className="mt-1 text-sm text-yellow-500">
                    No videos with "ready" status found for this artist.
                  </p>
                )}
              </motion.div>
            )}
           
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="block text-sm font-medium mb-1 dark:text-white">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  required
                  className="w-full pl-10 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={format(formData.start, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    const start = new Date(formData.start);
                    start.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    
                    const end = new Date(start);
                    end.setHours(23, 59, 59);
                    
                    setFormData({ ...formData, start, end });
                  }}
                  disabled={loading}
                />
              </div>
            </motion.div>
           
            {formData.submissionId && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <label className="block text-sm font-medium mb-1 dark:text-white">
                    Video Type
                  </label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                        formData.type === 'song-specific' 
                          ? 'bg-emerald-500' 
                          : 'bg-violet-500'
                      }`}></span>
                      <span className="text-gray-700 dark:text-gray-200 capitalize">
                        {formData.type.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </motion.div>
               
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <label className="block text-sm font-medium mb-1 dark:text-white">
                    Video Name
                  </label>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <span className="text-gray-700 dark:text-gray-200">
                      {formData.title}
                    </span>
                    {/* Show video notes if available */}
                    {(() => {
                      const submission = readySubmissions.find(s => s.id.toString() === formData.submissionId);
                      return submission?.notes ? (
                        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Video Notes:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {submission.notes}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <label className="block text-sm font-medium mb-1 dark:text-white">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add notes about this scheduled post..."
                    className="w-full h-24 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optional notes about this scheduled post
                  </p>
                </motion.div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-between pt-4">
          <motion.div 
            className="flex space-x-2 ml-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {post && (
              <motion.button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-600 dark:border-red-400 rounded-md"
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Remove from Content Plan
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSubmit}
              disabled={loading || !formData.submissionId}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading && formData.submissionId ? { scale: 1.05 } : {}}
              whileTap={!loading && formData.submissionId ? { scale: 0.95 } : {}}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                'Save Post'
              )}
            </motion.button>
          </motion.div>
        </div>

      
      <AnimatePresence>
        {showRemoveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
              variants={confirmVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h3 className="text-lg font-medium mb-4 dark:text-white">Remove from Content Plan</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to remove this post from the content calendar? The video will remain in your video submissions and ad creatives.
              </p>
              <div className="flex justify-end space-x-2">
                <motion.button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleRemoveFromContentPlan}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
                variants={confirmVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h3 className="text-lg font-medium mb-4 dark:text-white">Remove Post</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to remove this post from the content calendar?
                </p>
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={resetStatusOnDelete}
                      onChange={(e) => setResetStatusOnDelete(e.target.checked)}
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Reset video status to "Ready"
                    </span>
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <motion.button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Removing...
                      </>
                    ) : (
                      'Remove'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};