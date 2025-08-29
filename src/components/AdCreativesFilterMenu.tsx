import React from 'react';
import { Filter } from 'lucide-react';
import { useStore } from '../store';

interface AdCreativesFilterMenuProps {
  selectedArtist: string;
  setSelectedArtist: (id: string) => void;
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
}

export function AdCreativesFilterMenu({
  selectedArtist,
  setSelectedArtist,
  selectedPlatform,
  setSelectedPlatform,
  selectedStatus,
  setSelectedStatus
}: AdCreativesFilterMenuProps) {
  const { artists } = useStore();

  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  const handleArtistChange = (artistId: string) => {
    setSelectedArtist(artistId);
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const clearAllFilters = () => {
    setSelectedArtist('');
    setSelectedPlatform('');
    setSelectedStatus('');
  };

  const hasActiveFilters = selectedArtist || selectedPlatform || selectedStatus;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary-500" />
          <h3 className="text-lg font-medium dark:text-white">Filter Ad Creatives</h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-200 px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Artist
          </label>
          <select
            value={selectedArtist}
            onChange={(e) => handleArtistChange(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Artists</option>
            {activeArtists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Platform
          </label>
          <select
            value={selectedPlatform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="dropbox">Dropbox</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );
}