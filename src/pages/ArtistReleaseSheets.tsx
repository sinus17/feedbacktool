import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video, Instagram, Calendar, FileText, Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { useStore } from '../store';
import { ReleaseService, ReleaseSheet, Release } from '../services/releaseService';

export const ArtistReleaseSheets: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artists, fetchArtists } = useStore();
  
  const [releaseSheets, setReleaseSheets] = useState<ReleaseSheet[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchArtists();
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [sheetsData, releasesData] = await Promise.all([
        ReleaseService.getReleaseSheets(id),
        ReleaseService.getReleases()
      ]);
      
      setReleaseSheets(sheetsData);
      setReleases(releasesData);
    } catch (error) {
      console.error('Error loading release sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const artist = artists.find(a => a.id === id);

  const filteredSheets = releaseSheets.filter(sheet => {
    const matchesSearch = sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sheet.release_title?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!artist && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!artist && artists.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Artist not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please check the URL and try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <Video className="h-6 w-6" />
              <span className="text-xl font-bold">VideoFeedback</span>
            </div>
            
            <div className="flex justify-between items-end border-b border-white/20">
              <div className="flex space-x-4">
                <Link
                  to={`/artist/${id}`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Video className="h-4 w-4" />
                    <span>Videos</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/ad-creatives`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Instagram className="h-4 w-4" />
                    <span>Ad Creatives</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/content-plan`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Content Plan</span>
                  </div>
                </Link>
              </div>
              
              <Link
                to={`/artist/${id}/release-sheets`}
                className="pb-2 px-1 border-b-2 border-white text-white"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Release Sheets</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold dark:text-white">
                {artist?.name}'s Release Sheets
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage release documentation and planning
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>New Sheet</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search sheets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Release Sheets Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No sheets match your filters' : 'No release sheets yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first release sheet to get started'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Release Sheet
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSheets.map((sheet) => (
                <div key={sheet.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                          {sheet.title}
                        </h3>
                        {sheet.release_title && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Release: {sheet.release_title}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Created: {formatDate(sheet.created_at)}
                      </div>
                      {sheet.due_date && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Release Date: {formatDate(sheet.due_date)}
                        </div>
                      )}
                      {sheet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sheet.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {sheet.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                              +{sheet.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Link
                        to={`/artist/${id}/release-sheets/${sheet.id}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Sheet</span>
                      </Link>
                      
                      <div className="flex items-center space-x-1">
                        <Link
                          to={`/artist/${id}/release-sheets/${sheet.id}/edit`}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this sheet?')) {
                              ReleaseService.deleteReleaseSheet(sheet.id).then(() => {
                                loadData();
                              });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Sheet Modal */}
        {showCreateModal && (
          <CreateSheetModal
            artistId={id!}
            releases={releases}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
          />
        )}
      </main>
    </div>
  );
};

interface CreateSheetModalProps {
  artistId: string;
  releases: Release[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSheetModal: React.FC<CreateSheetModalProps> = ({
  artistId,
  releases,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      
      const selectedRelease = releases.find(r => r.id === releaseId);
      
      await ReleaseService.createReleaseSheet({
        title: title.trim(),
        artist_id: artistId,
        release_id: releaseId || null,
        release_title: selectedRelease?.title || null,
        content: { blocks: [] },
        status: 'draft',
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        cover_image_url: null,
        due_date: dueDate || null,
        completed_at: null
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating release sheet:', error);
      alert('Failed to create release sheet. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Release Sheet
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sheet Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter sheet title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Release
              </label>
              <select
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a release (optional)</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Release Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Sheet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
