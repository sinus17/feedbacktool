import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Copy, Check, Eye, Loader, Edit, Archive, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { AddArtistModal } from '../components/AddArtistModal';
import { EditArtistModal } from '../components/EditArtistModal';
import { PreviewModal } from '../components/PreviewModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const Artists: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    artistId: string | null;
    artistName: string;
  }>({
    isOpen: false,
    artistId: null,
    artistName: '',
  });

  const { artists, fetchArtists, deleteArtist, loading, error } = useStore();

  useEffect(() => {
    fetchArtists().catch(console.error);
  }, [fetchArtists]);

  const copyPublicUrl = async (artistId: string) => {
    const url = `https://tool.swipeup-marketing.com/artist/${artistId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(artistId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openPreview = (artistId: string) => {
    const url = `https://tool.swipeup-marketing.com/artist/${artistId}`;
    setPreviewUrl(url);
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      artistId: id,
      artistName: name,
    });
  };

  const handleDeleteArtist = async () => {
    if (deleteConfirmation.artistId) {
      try {
        await deleteArtist(deleteConfirmation.artistId);
      } catch (error) {
        console.error('Failed to delete artist:', error);
      }
    }
    setDeleteConfirmation({
      isOpen: false,
      artistId: null,
      artistName: '',
    });
  };

  // Filter out archived artists
  const activeArtists = artists.filter(artist => artist.archived !== true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Artist Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage artists and their feedback pages
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn">
          <Plus className="h-5 w-5 mr-2" />
          Add Artist
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => fetchArtists()}
              className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Artists Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Artist
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Videos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Public URL
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activeArtists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No artists found
                  </td>
                </tr>
              ) : (
                activeArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {artist.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {artist.whatsappGroupId ? (
                        <a
                          href={`https://chat.whatsapp.com/${artist.whatsappGroupId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center text-sm"
                        >
                          Open Group <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {artist.submissions || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openPreview(artist.id)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Preview Artist View"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => copyPublicUrl(artist.id)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                          title={copiedId === artist.id ? 'Copied!' : 'Copy URL'}
                        >
                          {copiedId === artist.id ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingArtist(artist)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Edit Artist"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(artist.id, artist.name)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete Artist"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddArtistModal onClose={() => setShowAddModal(false)} />}
      {editingArtist && (
        <EditArtistModal
          artist={editingArtist}
          onClose={() => setEditingArtist(null)}
        />
      )}
      {previewUrl && <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Artist"
        message={`Are you sure you want to delete ${deleteConfirmation.artistName}? This action cannot be undone and will remove all associated videos.`}
        onConfirm={handleDeleteArtist}
        onCancel={() => setDeleteConfirmation({ isOpen: false, artistId: null, artistName: '' })}
      />
    </div>
  );
};