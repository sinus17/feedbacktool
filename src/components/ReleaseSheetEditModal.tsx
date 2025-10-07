import React, { useEffect, useState } from 'react';
import { X, Save, Calendar as CalendarIcon, Loader, Pencil } from 'lucide-react';
import type { ReleaseSheet, Release } from '../services/releaseService';

interface Props {
  sheet: ReleaseSheet;
  artists: { id: string; name: string }[];
  loadReleases: () => Promise<Release[]>;
  onClose: () => void;
  onSaved: (updated: ReleaseSheet) => void;
  onUpdate: (id: string, updates: Partial<ReleaseSheet>) => Promise<ReleaseSheet>;
}

export const ReleaseSheetEditModal: React.FC<Props> = ({ sheet, artists, loadReleases, onClose, onSaved, onUpdate }) => {
  const [title, setTitle] = useState(sheet.title || '');
  const [artistId, setArtistId] = useState<string>(sheet.artist_id || '');
  const [releaseId, setReleaseId] = useState<string | ''>(sheet.release_id || '');
  const [releaseTitle, setReleaseTitle] = useState<string>(sheet.release_title || '');
  const [dueDate, setDueDate] = useState<string>(sheet.due_date ? sheet.due_date.substring(0, 10) : '');
  const [releases, setReleases] = useState<Release[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoadingReleases(true);
        const list = await loadReleases();
        console.log('📀 Loaded releases for dropdown:', list.length, 'releases');
        console.log('📀 First few releases:', list.slice(0, 3));
        setReleases(list);
      } finally {
        setLoadingReleases(false);
      }
    };
    fetch();
  }, [loadReleases]);

  const handleSelectRelease = (id: string) => {
    setReleaseId(id);
    const rel = releases.find(r => r.id === id);
    setReleaseTitle(rel?.title || '');
    
    // Auto-fill release date from the selected release
    if (rel?.release_date) {
      const date = new Date(rel.release_date);
      const formattedDate = date.toISOString().substring(0, 10);
      setDueDate(formattedDate);
      console.log('📅 Auto-filled release date:', formattedDate, 'from release:', rel.title);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Partial<ReleaseSheet> = {
        title,
        artist_id: artistId,
        release_id: releaseId || null,
        release_title: releaseId ? releaseTitle : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      } as any;
      const updated = await onUpdate(sheet.id, updates);
      onSaved(updated);
      onClose();
    } catch (e) {
      console.error('Failed updating sheet', e);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Release Sheet</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Release sheet title"
            />
          </div>

          {/* Artist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Artist</label>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="" disabled>Select artist</option>
              {artists.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Link to Release */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Release</label>
            <div className="relative">
              {loadingReleases && (
                <div className="absolute right-2 top-2 text-gray-400"><Loader className="h-4 w-4 animate-spin" /></div>
              )}
              <select
                value={releaseId}
                onChange={(e) => handleSelectRelease(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">— Not linked —</option>
                {releases.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.artist_name ? `— ${r.artist_name}` : ''} {r.release_date ? `(${new Date(r.release_date).toLocaleDateString()})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Release Date (due date) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Release Date</label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={handleSave} disabled={saving || !title || !artistId} className="btn inline-flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
