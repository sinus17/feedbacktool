import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { ReleaseService, type ReleaseSheet, type Release } from '../services/releaseService';
import { AlertCircle, ExternalLink, Loader, Search, Plus, FileText, Trash2, Edit3, Pencil } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ReleaseSheetEditModal } from '../components/ReleaseSheetEditModal';
import { CreateReleaseSheetModal } from '../components/CreateReleaseSheetModal';
import { supabase } from '../lib/supabase';

interface Template {
  id: string;
  name: string;
  content: any;
  tags: string[];
  language: string;
  created_at: string;
  updated_at: string;
}

export const ReleaseSheets: React.FC = () => {
  const { artists, fetchArtists } = useStore();
  const [searchParams] = useSearchParams();
  const [sheets, setSheets] = useState<ReleaseSheet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingSheet, setEditingSheet] = useState<ReleaseSheet | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sheets' | 'templates'>(() => {
    const tab = searchParams.get('tab');
    return tab === 'templates' ? 'templates' : 'sheets';
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    // Ensure artists are available for name lookups
    if (artists.length === 0) {
      fetchArtists().catch(console.error);
    }
  }, [artists.length, fetchArtists]);

  useEffect(() => {
    const loadSheets = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ReleaseService.getReleaseSheets();
        setSheets(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load release sheets');
      } finally {
        setLoading(false);
      }
    };
    loadSheets();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('release_sheet_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates((data || []) as unknown as Template[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const query: any = supabase
        .from('release_sheet_templates')
        .delete();
      const { error } = await query.eq('id', id);
      
      if (error) throw error;
      await loadTemplates();
    } catch (e: any) {
      alert(e?.message || 'Failed to delete template');
    }
  };

  const artistNameById = useMemo(() => {
    const map = new Map<string, string>();
    artists.forEach(a => map.set(a.id.toString(), a.name));
    return map;
  }, [artists]);

  const filteredSheets = useMemo(() => {
    return sheets
      .filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const artistName = artistNameById.get(s.artist_id?.toString?.() || '') || '';
        
        // Extract text content from blocks (both 'html' and 'paragraph' types)
        let contentText = '';
        if (s.content && s.content.blocks) {
          contentText = s.content.blocks
            .map((block: any) => {
              if (block.content) {
                // Strip HTML tags to get plain text
                return block.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
              }
              return '';
            })
            .join(' ')
            .toLowerCase();
        }
        
        return (
          (s.title || '').toLowerCase().includes(term) ||
          (s.release_title || '').toLowerCase().includes(term) ||
          artistName.toLowerCase().includes(term) ||
          (s.status || '').toLowerCase().includes(term) ||
          contentText.includes(term)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sheets, searchTerm, artistNameById]);

  const loadReleases = async (): Promise<Release[]> => {
    return await ReleaseService.getReleases();
  };

  const handleSaved = (updated: ReleaseSheet) => {
    setSheets(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
  };

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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Release Sheets</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all release sheets across artists
          </p>
        </div>
        <button 
          onClick={() => activeTab === 'sheets' ? setShowCreateModal(true) : setShowTemplateModal(true)}
          className="btn flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>{activeTab === 'sheets' ? 'Add Sheet' : 'Add Template'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sheets'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Sheets</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Templates</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'sheets' && (
        <>
          {/* Search and Filter Controls */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by title, artist, release, status, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                ReleaseService.getReleaseSheets()
                  .then(setSheets)
                  .catch((e) => setError(e?.message || 'Failed to load release sheets'))
                  .finally(() => setLoading(false));
              }}
              className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Release Sheets Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Artist
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Release
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSheets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No release sheets found
                  </td>
                </tr>
              ) : (
                filteredSheets.map((sheet) => {
                  const artistId = sheet.artist_id?.toString?.() || '';
                  const artistName = artistNameById.get(artistId) || '-';
                  const created = new Date(sheet.created_at).toLocaleString();
                  return (
                    <tr key={sheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {sheet.title || 'Untitled Sheet'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{artistName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{sheet.release_title || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{created}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/artist/${artistId}/release-sheets/${sheet.id}`}
                            state={{ fromAdmin: true }}
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Edit Sheet"
                          >
                            <Pencil className="h-5 w-5" />
                          </Link>
                          <a
                            href={`https://tool.swipeup-marketing.com/artist/${artistId}/release-sheets`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Open Artist Release Sheets (public)"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Language
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No templates found
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {template.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {template.language?.toUpperCase() || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(template.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/release-sheets/templates/${template.id}/edit`}
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Open Editor"
                          >
                            <Edit3 className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Template"
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
      )}
      {editingSheet && (
        <ReleaseSheetEditModal
          sheet={editingSheet}
          artists={artists.map(a => ({ id: a.id.toString(), name: a.name }))}
          loadReleases={loadReleases}
          onClose={() => setEditingSheet(null)}
          onSaved={handleSaved}
          onUpdate={async (id, updates) => {
            const updated = await ReleaseService.updateReleaseSheet(id, updates);
            return updated;
          }}
        />
      )}

      {showCreateModal && (
        <CreateReleaseSheetModal
          artists={artists.map(a => ({ id: a.id.toString(), name: a.name }))}
          onClose={() => setShowCreateModal(false)}
          onSuccess={async () => {
            setShowCreateModal(false);
            // Reload sheets after creation
            try {
              setLoading(true);
              const data = await ReleaseService.getReleaseSheets();
              setSheets(data);
            } catch (e: any) {
              setError(e?.message || 'Failed to load release sheets');
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {showTemplateModal && (
        <TemplateModal
          template={null}
          onClose={() => {
            setShowTemplateModal(false);
          }}
          onSuccess={() => {
            setShowTemplateModal(false);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
};

interface TemplateModalProps {
  template: Template | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('de');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      
      // Create new template
      const { error } = await supabase
        .from('release_sheet_templates')
        .insert({
          name: name.trim(),
          language,
          content: { blocks: [] },
          is_global: true
        } as any);
      
      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Template
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="de">German (DE)</option>
                <option value="en">English (EN)</option>
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
                disabled={saving || !name.trim()}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

