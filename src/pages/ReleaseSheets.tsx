import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { ReleaseService, type ReleaseSheet, type Release } from '../services/releaseService';
import { AlertCircle, ExternalLink, Eye, Filter, Loader, Search, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReleaseSheetEditModal } from '../components/ReleaseSheetEditModal';

export const ReleaseSheets: React.FC = () => {
  const { artists, fetchArtists } = useStore();
  const [sheets, setSheets] = useState<ReleaseSheet[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editingSheet, setEditingSheet] = useState<ReleaseSheet | null>(null);

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

  const artistNameById = useMemo(() => {
    const map = new Map<string, string>();
    artists.forEach(a => map.set(a.id.toString(), a.name));
    return map;
  }, [artists]);

  const filteredSheets = useMemo(() => {
    return sheets
      .filter(s => (statusFilter ? s.status === statusFilter : true))
      .filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const artistName = artistNameById.get(s.artist_id?.toString?.() || '') || '';
        return (
          (s.title || '').toLowerCase().includes(term) ||
          (s.release_title || '').toLowerCase().includes(term) ||
          artistName.toLowerCase().includes(term) ||
          (s.status || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sheets, searchTerm, statusFilter, artistNameById]);

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
                placeholder="Search by title, artist, release, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 h-5 w-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
                          <button
                            onClick={() => setEditingSheet(sheet)}
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Edit Sheet"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <Link
                            to={`/artist/${artistId}/release-sheets/${sheet.id}`}
                            state={{ fromAdmin: true }}
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                            title="Open Sheet"
                          >
                            <Eye className="h-5 w-5" />
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
    </div>
  );
}

