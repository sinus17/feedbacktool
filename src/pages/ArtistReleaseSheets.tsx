import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, FileText, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useStore } from '../store';
import { ReleaseService, ReleaseSheet, Release } from '../services/releaseService';
import { supabase } from '../lib/supabase';

export const ArtistReleaseSheets: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artists, fetchArtists } = useStore();
  
  const [releaseSheets, setReleaseSheets] = useState<ReleaseSheet[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
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

  const filteredSheets = releaseSheets;

  // Filter releases to only show those for the current artist
  const filteredReleases = releases.filter(release => {
    if (!artist) return false;
    return release.artist_name?.toLowerCase() === artist.name.toLowerCase();
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
    <div className="bg-gray-50 dark:bg-[#000000]">
      <header className="bg-primary-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-6 w-6" fill="currentColor">
                <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z"/>
              </svg>
              <span className="text-xl font-bold">VideoFeedback</span>
            </div>
            
            <div className="flex justify-between items-end border-b border-white/20">
              <div className="flex space-x-4">
                <Link
                  to={`/artist/${id}`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                      <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z"/>
                    </svg>
                    <span>Videos</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/ad-creatives`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                      <path d="M544 96C526.3 96 512 110.3 512 128L512 137.1L126.8 247.2C123 233.8 110.6 224 96 224C78.3 224 64 238.3 64 256L64 384C64 401.7 78.3 416 96 416C110.6 416 123 406.2 126.8 392.8L198.5 413.3C194.3 424.1 192 435.8 192 448C192 501 235 544 288 544C334.9 544 374 510.3 382.3 465.8L512 502.8L512 511.9C512 529.6 526.3 543.9 544 543.9C561.7 543.9 576 529.6 576 511.9L576 127.9C576 110.2 561.7 95.9 544 95.9zM335.8 452.5C333.5 476.9 313 496 288 496C261.5 496 240 474.5 240 448C240 440.3 241.8 433 245 426.6L335.8 452.5z"/>
                    </svg>
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
                  <span>Sheets</span>
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


          {/* Release Sheets Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No release sheets yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create your first release sheet to get started
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Release Sheet
              </button>
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
            releases={filteredReleases}
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
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { data, error } = await supabase.rpc('get_release_sheet_templates', {
          artist_id_param: artistId
        });
        
        if (error) {
          console.error('Error loading templates:', error);
          return;
        }
        
        const templateList = Array.isArray(data) ? data : [];
        setTemplates(templateList);
        
        // Auto-select "Release Sheet Template (DE)" if available
        const deTemplate = templateList.find(t => 
          t.name?.includes('Release Sheet Template') && 
          (t.name?.includes('(DE)') || t.language === 'de')
        );
        if (deTemplate) {
          setTemplateId(deTemplate.id);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, [artistId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      
      const selectedRelease = releases.find(r => r.id === releaseId);
      const selectedTemplate = templates.find(t => t.id === templateId);
      
      // Convert dd/mm/yyyy to yyyy-mm-dd for database
      let formattedDueDate = null;
      if (dueDate && dueDate.length === 10) {
        const [day, month, year] = dueDate.split('/');
        if (day && month && year && year.length === 4) {
          formattedDueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      await ReleaseService.createReleaseSheet({
        title: title.trim(),
        artist_id: artistId,
        release_id: releaseId || null,
        release_title: selectedRelease?.title || null,
        content: selectedTemplate?.content || { blocks: [] },
        status: 'draft',
        tags: [],
        cover_image_url: null,
        due_date: formattedDueDate,
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
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setReleaseId(selectedId);
                  
                  if (selectedId) {
                    const selectedRelease = releases.find(r => r.id === selectedId);
                    if (selectedRelease) {
                      // Auto-fill title with release name if title is empty
                      if (!title.trim()) {
                        setTitle(selectedRelease.title);
                      }
                      
                      // Auto-fill release date if date is empty and release has a date
                      if (!dueDate.trim() && selectedRelease.release_date) {
                        // Convert yyyy-mm-dd to dd/mm/yyyy
                        const date = new Date(selectedRelease.release_date);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        setDueDate(`${day}/${month}/${year}`);
                      }
                    }
                  }
                }}
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
                type="text"
                placeholder="dd/mm/yyyy"
                value={dueDate}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                  if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                  if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                  setDueDate(value);
                }}
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Start with blank sheet</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.language && !template.name.includes(`(${template.language.toUpperCase()})`) 
                      ? ` (${template.language.toUpperCase()})` 
                      : ''}
                  </option>
                ))}
              </select>
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
