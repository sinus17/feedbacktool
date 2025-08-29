import React, { useState } from 'react';
import { X, AlertCircle, Loader } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

interface AddArtistModalProps {
  onClose: () => void;
}

export const AddArtistModal: React.FC<AddArtistModalProps> = ({ onClose }) => {
  const addArtist = useStore((state) => state.addArtist);
  const { artists } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    whatsapp_group_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out archived artists for name validation
  const activeArtists = artists.filter(artist => !artist.archived);

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Artist name is required');
      return false;
    }

    // Check if an active artist with this name already exists
    const existingArtist = activeArtists.find(
      artist => artist.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );
    
    if (existingArtist) {
      setError('An artist with this name already exists');
      return false;
    }

    if (formData.whatsapp_group_id && !/^\d{15,}$/.test(formData.whatsapp_group_id)) {
      setError('Please enter a valid WhatsApp group ID (at least 15 digits)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      await addArtist({
        name: formData.name.trim(),
        whatsappGroupId: formData.whatsapp_group_id.trim() || null,
      });

      onClose();
    } catch (err) {
      console.error('Failed to add artist:', err);
      if (err instanceof Error) {
        if (err.message === 'duplicate_entry') {
          setError('An artist with similar details already exists. Please check your input.');
        } else if (err.message === 'duplicate_artist_id') {
          setError('An artist with this ID already exists. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to add artist. Please try again.');
      }
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
        className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Add New Artist</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              WhatsApp Group ID
            </label>
            <input
              type="text"
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="120363298754236172 (at least 15 digits)"
              value={formData.whatsapp_group_id}
              onChange={(e) => setFormData({ ...formData, whatsapp_group_id: e.target.value })}
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the numeric group ID from the WhatsApp group URL
            </p>
          </motion.div>

          <motion.div
            className="flex justify-end space-x-2 pt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
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
              type="submit"
              disabled={loading}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              whileHover={!loading ? { scale: 1.05 } : {}}
              whileTap={!loading ? { scale: 0.95 } : {}}
            >
              {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
              {loading ? 'Adding...' : 'Add Artist'}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};