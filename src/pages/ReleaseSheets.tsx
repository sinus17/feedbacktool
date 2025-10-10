import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { ReleaseService, type ReleaseSheet, type Release } from '../services/releaseService';
import { AlertCircle, ExternalLink, Loader, Search, Plus, Pencil, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReleaseSheetEditModal } from '../components/ReleaseSheetEditModal';
import { CreateReleaseSheetModal } from '../components/CreateReleaseSheetModal';
import { supabase } from '../lib/supabase';

export const ReleaseSheets: React.FC = () => {
  const { artists, fetchArtists } = useStore();
  const [sheets, setSheets] = useState<ReleaseSheet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingSheet, setEditingSheet] = useState<ReleaseSheet | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        
        // Load both regular sheets and templates
        const [regularSheets, templatesData] = await Promise.all([
          ReleaseService.getReleaseSheets(),
          supabase.from('release_sheet_templates').select('*').order('created_at', { ascending: false })
        ]);
        
        if (templatesData.error) throw templatesData.error;
        
        // Map templates to sheet format and mark them as templates
        const templatesAsSheets = (templatesData.data || []).map((template: any) => ({
          id: template.id,
          title: template.name,
          artist_id: 'template', // Special marker for templates
          release_id: null,
          release_title: null,
          content: template.content,
          status: 'draft' as const,
          tags: template.tags || [],
          cover_image_url: null,
          due_date: null,
          completed_at: null,
          created_at: template.created_at,
          updated_at: template.updated_at,
          is_template: true // Add marker
        }));
        
        // Combine and sort: templates first, then by created_at within each group
        const allSheets = [...regularSheets, ...templatesAsSheets].sort((a, b) => {
          const aIsTemplate = (a as any).is_template === true;
          const bIsTemplate = (b as any).is_template === true;
          
          // Templates always come first
          if (aIsTemplate && !bIsTemplate) return -1;
          if (!aIsTemplate && bIsTemplate) return 1;
          
          // Within same group, sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setSheets(allSheets);
      } catch (e: any) {
        setError(e?.message || 'Failed to load release sheets');
      } finally {
        setLoading(false);
      }
    };
    loadSheets();
  }, []);


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
      .sort((a, b) => {
        const aIsTemplate = (a as any).is_template === true;
        const bIsTemplate = (b as any).is_template === true;
        
        // Templates always come first
        if (aIsTemplate && !bIsTemplate) return -1;
        if (!aIsTemplate && bIsTemplate) return 1;
        
        // Within same group, sort by created_at (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Release Sheets</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all release sheets across artists
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Sheet</span>
        </button>
      </div>

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
                  const isTemplate = (sheet as any).is_template === true;
                  const artistId = sheet.artist_id?.toString?.() || '';
                  const artistName = isTemplate ? 'Template' : (artistNameById.get(artistId) || '-');
                  const created = new Date(sheet.created_at).toLocaleString();
                  return (
                    <tr key={sheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {sheet.title || 'Untitled Sheet'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isTemplate ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                            Template
                          </span>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-gray-100">{artistName}</div>
                        )}
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
                            to={isTemplate ? `/artist/template/release-sheets/${sheet.id}` : `/artist/${artistId}/release-sheets/${sheet.id}`}
                            state={{ fromAdmin: true, isTemplate: isTemplate }}
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Edit Sheet"
                          >
                            <Pencil className="h-5 w-5" />
                          </Link>
                          {isTemplate ? (
                            <button
                              onClick={async () => {
                                if (!confirm('Duplicate this template as a new template?')) return;
                                try {
                                  // Get the template data
                                  const { data: templateData, error: fetchError } = await (supabase as any)
                                    .from('release_sheet_templates')
                                    .select('*')
                                    .eq('id', sheet.id)
                                    .single();
                                  
                                  if (fetchError) throw fetchError;
                                  
                                  // Create duplicate with "Copy of" prefix
                                  const { error: insertError } = await (supabase as any)
                                    .from('release_sheet_templates')
                                    .insert({
                                      name: `Copy of ${templateData.name}`,
                                      content: templateData.content,
                                      language: templateData.language,
                                      tags: templateData.tags,
                                      is_global: templateData.is_global
                                    });
                                  
                                  if (insertError) throw insertError;
                                  
                                  // Reload sheets
                                  const [regularSheets, templatesData] = await Promise.all([
                                    ReleaseService.getReleaseSheets(),
                                    supabase.from('release_sheet_templates').select('*').order('created_at', { ascending: false })
                                  ]);
                                  
                                  if (templatesData.error) throw templatesData.error;
                                  
                                  const templatesAsSheets = (templatesData.data || []).map((template: any) => ({
                                    id: template.id,
                                    title: template.name,
                                    artist_id: 'template',
                                    release_id: null,
                                    release_title: null,
                                    content: template.content,
                                    status: 'draft' as const,
                                    tags: template.tags || [],
                                    cover_image_url: null,
                                    due_date: null,
                                    completed_at: null,
                                    created_at: template.created_at,
                                    updated_at: template.updated_at,
                                    is_template: true
                                  }));
                                  
                                  const allSheets = [...regularSheets, ...templatesAsSheets].sort((a, b) => {
                                    const aIsTemplate = (a as any).is_template === true;
                                    const bIsTemplate = (b as any).is_template === true;
                                    
                                    // Templates always come first
                                    if (aIsTemplate && !bIsTemplate) return -1;
                                    if (!aIsTemplate && bIsTemplate) return 1;
                                    
                                    // Within same group, sort by created_at (newest first)
                                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                  });
                                  
                                  setSheets(allSheets);
                                } catch (error: any) {
                                  alert(error?.message || 'Failed to duplicate template');
                                }
                              }}
                              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Duplicate Template"
                            >
                              <Copy className="h-5 w-5" />
                            </button>
                          ) : (
                            <a
                              href={`https://tool.swipeup-marketing.com/artist/${artistId}/release-sheets`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Open Artist Release Sheets (public)"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          )}
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
    </div>
  );
};
