import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ReleaseService, Release } from '../services/releaseService';

interface CreateReleaseSheetModalProps {
  artists: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateReleaseSheetModal: React.FC<CreateReleaseSheetModalProps> = ({
  artists,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [releases, setReleases] = useState<Release[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [artistSearch, setArtistSearch] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);

  // Get filtered releases for the selected artist
  const filteredReleases = releases.filter(release => {
    if (!artistId) return false;
    return release.artist_id === artistId;
  });

  // Load releases from local database
  useEffect(() => {
    const loadReleases = async () => {
      try {
        const { data, error } = await supabase
          .from('releases')
          .select(`
            id,
            name,
            artist_id,
            release_date,
            artists (
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data to match expected format
        const transformedReleases = (data || []).map((release: any) => ({
          id: release.id,
          title: release.name,
          artist_name: release.artists?.name || '',
          artist_id: release.artist_id,
          release_date: release.release_date
        }));

        setReleases(transformedReleases as any);
      } catch (error) {
        console.error('Error loading releases:', error);
      }
    };
    loadReleases();
  }, []);

  // Load templates on mount to show default template
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        console.log('Starting to load templates...');
        
        // Try to load templates using the RPC function first
        let templateList: any[] = [];
        
        // First attempt: Try the RPC function (this is what was working before)
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_release_sheet_templates', {
            artist_id_param: 'template'
          });
          
          if (!rpcError && rpcData) {
            templateList = Array.isArray(rpcData) ? rpcData : [];
            console.log('Loaded templates via RPC:', templateList.length, 'templates');
          }
        } catch (rpcErr) {
          console.log('RPC method failed, trying direct query:', rpcErr);
        }
        
        // Second attempt: Direct query if RPC failed
        if (templateList.length === 0) {
          const { data, error } = await supabase
            .from('release_sheets')
            .select('*')
            .eq('artist_id', 'template' as any)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error loading templates via direct query:', error);
          } else {
            templateList = (data || []) as any[];
            console.log('Loaded templates via direct query:', templateList.length, 'templates');
          }
        }
        
        console.log('Final template list:', templateList);
        console.log('Template details:', templateList.map((t: any) => ({ id: t.id, title: t.title, name: t.name, language: t.language })));
        
        setTemplates(templateList);
        
        // Auto-select "Release Sheet Template (DE)" if available
        const deTemplate = templateList.find((t: any) => {
          const title = t.title || t.name || '';
          return title.includes('Release Sheet Template') && 
                 (title.includes('(DE)') || t.language === 'de');
        });
        
        if (deTemplate) {
          console.log('Auto-selecting DE template:', deTemplate.id, deTemplate.title || deTemplate.name);
          setTemplateId(deTemplate.id);
        } else {
          console.log('No DE template found. Looking for any template with "Release Sheet Template"');
          const anyTemplate = templateList.find((t: any) => {
            const title = t.title || t.name || '';
            return title.includes('Release Sheet Template');
          });
          if (anyTemplate) {
            console.log('Auto-selecting first matching template:', anyTemplate.id, anyTemplate.title || anyTemplate.name);
            setTemplateId(anyTemplate.id);
          } else {
            console.log('No matching templates found. Total templates:', templateList.length);
          }
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates([]);
      }
    };

    loadTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artistId) return;

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

      // Check if creating as template
      const isCreatingTemplate = templateId === '__create_template__';

      if (isCreatingTemplate) {
        // Create as template
        const newSheet = await ReleaseService.createReleaseSheet({
          title: title.trim(),
          artist_id: 'template',
          release_id: null,
          release_title: null,
          content: { blocks: [] },
          status: 'draft',
          tags: [],
          cover_image_url: null,
          due_date: null,
          completed_at: null
        });

        // Redirect to template editor
        window.location.href = `/artist/template/release-sheets/${newSheet.id}`;
      } else {
        // Create regular release sheet
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
      }
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
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Start with blank sheet</option>
                <option value="__create_template__" className="text-green-600 dark:text-green-400 font-medium">+ Create as Template</option>
                {templates.map((template) => {
                  const displayTitle = template.title || template.name || 'Untitled Template';
                  const lang = template.language?.toUpperCase();
                  const showLang = lang && !displayTitle.includes(`(${lang})`);
                  return (
                    <option key={template.id} value={template.id}>
                      {displayTitle}{showLang ? ` (${lang})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {templateId !== '__create_template__' && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Artist *
                  </label>
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => {
                      setArtistSearch(e.target.value);
                      setShowArtistDropdown(true);
                      if (!e.target.value) {
                        setArtistId('');
                        setReleaseId('');
                      }
                    }}
                    onFocus={() => setShowArtistDropdown(true)}
                    placeholder="Search for an artist..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={!templateId || templateId === '__create_template__'}
                  />
                  {showArtistDropdown && artistSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                      {artists
                        .filter(artist => 
                          artist.name.toLowerCase().includes(artistSearch.toLowerCase())
                        )
                        .slice(0, 50)
                        .map((artist) => (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => {
                              setArtistId(artist.id);
                              setArtistSearch(artist.name);
                              setShowArtistDropdown(false);
                              setReleaseId('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            {artist.name}
                          </button>
                        ))}
                      {artists.filter(artist => 
                        artist.name.toLowerCase().includes(artistSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          No artists found
                        </div>
                      )}
                    </div>
                  )}
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
                        const selectedRelease = filteredReleases.find(r => r.id === selectedId);
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
                    disabled={!artistId}
                  >
                    <option value="">Select a release (optional)</option>
                    {filteredReleases.map((release) => (
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
              </>
            )}

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
                disabled={creating || !title.trim() || !artistId}
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
