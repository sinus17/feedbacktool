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

  // Get filtered releases for the selected artist
  const filteredReleases = releases.filter(release => {
    if (!artistId) return false;
    const selectedArtist = artists.find(a => a.id === artistId);
    if (!selectedArtist) return false;
    return release.artist_name?.toLowerCase() === selectedArtist.name.toLowerCase();
  });

  // Load releases
  useEffect(() => {
    const loadReleases = async () => {
      try {
        const data = await ReleaseService.getReleases();
        setReleases(data);
      } catch (error) {
        console.error('Error loading releases:', error);
      }
    };
    loadReleases();
  }, []);

  // Load templates when artist is selected
  useEffect(() => {
    if (!artistId) {
      setTemplates([]);
      setTemplateId('');
      return;
    }

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
                Artist *
              </label>
              <select
                value={artistId}
                onChange={(e) => {
                  setArtistId(e.target.value);
                  setTemplateId(''); // Reset template when artist changes
                  setReleaseId(''); // Reset release when artist changes
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select an artist</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={!artistId}
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
