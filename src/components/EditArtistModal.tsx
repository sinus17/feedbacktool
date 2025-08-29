import React, { useState } from 'react';
import { X, AlertCircle, Loader, Archive } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import type { Artist } from '../types';

interface EditArtistModalProps {
  artist: Artist;
  onClose: () => void;
}

export const EditArtistModal: React.FC<EditArtistModalProps> = ({ artist, onClose }) => {
  const { updateArtist, fetchArtists } = useStore();
  const [formData, setFormData] = useState({
    name: artist.name,
    whatsappGroupId: artist.whatsappGroupId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(false);

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Artist name is required');
      return false;
    }

    if (formData.whatsappGroupId && !/^\d{15,}$/.test(formData.whatsappGroupId)) {
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
      const { error: updateError } = await updateArtist(artist.id, {
        name: formData.name.trim(),
        whatsappGroupId: formData.whatsappGroupId.trim() || null,
      });

      if (updateError) throw updateError;
      await fetchArtists();
      onClose();
    } catch (err) {
      console.error('Failed to update artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to update artist');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    setError(null);


    try {
      const { error: updateError } = await updateArtist(artist.id, {
        archived: !artist.archived
      });

      if (updateError) throw updateError;
      onClose();
    } catch (err) {
      console.error('Failed to archive artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive artist');
    } finally {
      setLoading(false);
      setArchiveConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Edit Artist</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              WhatsApp Group ID
            </label>
            <input
              type="text"
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="120363298754236172 (at least 15 digits)"
              value={formData.whatsappGroupId}
              onChange={(e) => setFormData({ ...formData, whatsappGroupId: e.target.value })}
              disabled={loading} 
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the numeric group ID from the WhatsApp group URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Element ID
            </label>
            <input
              type="text"
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.elementId}
              onChange={(e) => setFormData({ ...formData, elementId: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="flex justify-between space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setArchiveConfirmation(true)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                artist.archived
                  ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                  : 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
              }`}
              disabled={loading}
            >
              <Archive className="h-5 w-5 mr-2" />
              {artist.archived ? 'Unarchive' : 'Archive'}
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Updating...' : 'Update Artist'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {archiveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              {artist.archived ? 'Unarchive Artist' : 'Archive Artist'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to {artist.archived ? 'unarchive' : 'archive'} {artist.name}?
              {!artist.archived && ' This will also archive all associated videos.'}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setArchiveConfirmation(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={loading}
                className="btn bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                {loading ? 'Processing...' : (artist.archived ? 'Unarchive' : 'Archive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};