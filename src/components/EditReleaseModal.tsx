import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Release {
  id: string;
  name: string;
  artist_id: string;
  release_date: string;
  status: string;
  ad_budget: number;
  total_budget: number;
  service_package: string;
  is_published: boolean;
  spotify_url: string | null;
  created_at: string;
  artists?: {
    name: string;
  };
}

interface EditReleaseModalProps {
  release: Release;
  onClose: () => void;
  onUpdate: () => void;
}

export const EditReleaseModal: React.FC<EditReleaseModalProps> = ({ release, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: release.name,
    release_date: release.release_date,
    status: release.status,
    ad_budget: release.ad_budget / 100, // Convert from cents to euros
    service_package: release.service_package,
    is_published: release.is_published,
    spotify_url: release.spotify_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('releases')
        .update({
          name: formData.name,
          release_date: formData.release_date,
          status: formData.status,
          ad_budget: Math.round(formData.ad_budget * 100), // Convert to cents
          total_budget: 400 + (formData.service_package === 'full' ? 400 : 0) + Math.round(formData.ad_budget * 100),
          service_package: formData.service_package,
          is_published: formData.is_published,
          spotify_url: formData.spotify_url || null,
        })
        .eq('id', release.id);

      if (error) throw error;

      toast.success('Release erfolgreich aktualisiert');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating release:', error);
      toast.error('Fehler beim Aktualisieren des Releases');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('releases')
        .delete()
        .eq('id', release.id);

      if (error) throw error;

      toast.success('Release erfolgreich gelöscht');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting release:', error);
      toast.error('Fehler beim Löschen des Releases');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Release bearbeiten</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Artist Name (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Künstler
            </label>
            <input
              type="text"
              value={release.artists?.name || 'Unbekannt'}
              disabled
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Release Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Release Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            />
          </div>

          {/* Release Date */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Release Datum *
            </label>
            <input
              type="date"
              name="release_date"
              value={formData.release_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            >
              <option value="submitted">Eingereicht</option>
              <option value="approved">Genehmigt</option>
              <option value="in_progress">In Bearbeitung</option>
              <option value="completed">Abgeschlossen</option>
              <option value="cancelled">Abgebrochen</option>
            </select>
          </div>

          {/* Service Package */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Service Paket *
            </label>
            <select
              name="service_package"
              value={formData.service_package}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            >
              <option value="basic">Basic</option>
              <option value="full">Full</option>
            </select>
          </div>

          {/* Ad Budget */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Media Budget (€) *
            </label>
            <input
              type="number"
              name="ad_budget"
              value={formData.ad_budget}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kann auch unter 650€ sein (Admin-Zugriff)
            </p>
          </div>

          {/* Spotify URL */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Spotify URL
            </label>
            <input
              type="url"
              name="spotify_url"
              value={formData.spotify_url}
              onChange={handleChange}
              placeholder="https://open.spotify.com/track/..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0000fe] focus:border-transparent"
            />
          </div>

          {/* Is Published */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              className="w-4 h-4 text-[#0000fe] bg-gray-800 border-gray-700 rounded focus:ring-[#0000fe]"
            />
            <label className="ml-2 text-sm text-white">
              Release ist bereits veröffentlicht
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: '#0000fe' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>

          {/* Delete Section */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Gefahrenzone</h3>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-800 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Release löschen
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {saving ? 'Löschen...' : 'Endgültig löschen'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
