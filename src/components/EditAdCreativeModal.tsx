import React, { useState } from 'react';
import { X, AlertCircle, Loader, Instagram } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

interface EditAdCreativeModalProps {
  creative: {
    id: string,
    content: string,
    platform: 'instagram' | 'tiktok',
    status: string
  };
  onClose: () => void;
}

export function EditAdCreativeModal({ creative, onClose }: EditAdCreativeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { updateAdCreativeStatus } = useStore();

  const rejectionReasons = [
    'the content violates the policy',
    'the content is invalid or expired',
    'the content is a co-post whose co-author we do not have advertising access to',
    'the content contains the official sound & is therefore not usable',
    'other reason'
  ];

  const handleReject = async () => {
    if (!rejectionReason) {
      setError('Please select a rejection reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateAdCreativeStatus(creative.id, 'rejected', rejectionReason);
      onClose();
    } catch (err) {
      console.error('Error rejecting ad creative:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject ad creative');
    } finally {
      setLoading(false);
    }
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
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Edit Ad Creative</h2>
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

        <div className="space-y-6">
          {/* Content Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium mb-2 dark:text-white">
              Content
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                {creative.platform === 'instagram' ? (
                  <Instagram className="h-5 w-5 text-white" />
                ) : (
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    className="h-5 w-5 text-white"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                )}
                <span className="text-sm font-medium dark:text-gray-200">
                  {creative.platform.charAt(0).toUpperCase() + creative.platform.slice(1)}
                </span>
              </div>
              <pre className="text-sm bg-white dark:bg-gray-800 p-3 rounded border dark:border-gray-600 overflow-x-auto">
                {creative.content}
              </pre>
            </div>
          </motion.div>

          {/* Rejection Reason */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <label className="block text-sm font-medium mb-2 dark:text-white">
              Rejection Reason
            </label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a reason</option>
              {rejectionReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </motion.div>

          <motion.div 
            className="flex justify-end space-x-2 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
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
              onClick={handleReject}
              disabled={loading || !rejectionReason}
              className="btn bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading && rejectionReason ? { scale: 1.05 } : {}}
              whileTap={!loading && rejectionReason ? { scale: 0.95 } : {}}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Rejecting...
                </>
              ) : (
                'Reject Content'
              )}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}