import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { useStore } from '../store';
import type { VideoSubmission } from '../types';

interface FilterMenuProps {
  selectedArtist: string;
  setSelectedArtist: (id: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  hideArtistFilter?: boolean;
  sortOrder?: 'newest' | 'oldest';
  setSortOrder?: (order: 'newest' | 'oldest') => void;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  selectedArtist,
  setSelectedArtist,
  selectedType,
  setSelectedType,
  selectedStatus,
  setSelectedStatus,
  hideArtistFilter = false,
  sortOrder = 'newest',
  setSortOrder = () => {},
}) => {
  const { artists } = useStore();
  const [artistSearch, setArtistSearch] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowArtistDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);
  
  // Get selected artist name
  const selectedArtistName = useMemo(() => {
    if (!selectedArtist) return '';
    const artist = activeArtists.find(a => a.id === selectedArtist);
    return artist?.name || '';
  }, [selectedArtist, activeArtists]);
  
  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!artistSearch.trim()) return activeArtists;
    const search = artistSearch.toLowerCase();
    return activeArtists.filter(artist => 
      artist.name.toLowerCase().includes(search)
    );
  }, [artistSearch, activeArtists]);

  const statusOptions: { value: VideoSubmission['status']; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'feedback-needed', label: 'Feedback Needed' },
    { value: 'correction-needed', label: 'Correction Needed' },
    { value: 'ready', label: 'Ready' },
    { value: 'posted', label: 'Posted' },
    { value: 'archived', label: 'Archived' }
  ];

  const typeOptions = [
    { value: 'song-specific', label: 'Song Specific' },
    { value: 'off-topic', label: 'Off Topic' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary-500" />
        <h3 className="text-lg font-medium dark:text-white">Filter Videos</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hideArtistFilter ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Artist
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={selectedArtistName || artistSearch}
                  onChange={(e) => {
                    setArtistSearch(e.target.value);
                    setShowArtistDropdown(true);
                    if (!e.target.value) {
                      setSelectedArtist('');
                    }
                  }}
                  onFocus={() => setShowArtistDropdown(true)}
                  placeholder="Search artists..."
                  className="w-full pl-10 pr-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                {(selectedArtist || artistSearch) && (
                  <button
                    onClick={() => {
                      setSelectedArtist('');
                      setArtistSearch('');
                      setShowArtistDropdown(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Dropdown */}
              {showArtistDropdown && filteredArtists.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  <button
                    onClick={() => {
                      setSelectedArtist('');
                      setArtistSearch('');
                      setShowArtistDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white text-sm font-medium border-b border-gray-200 dark:border-gray-600"
                  >
                    All Artists
                  </button>
                  {filteredArtists.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => {
                        setSelectedArtist(String(artist.id));
                        setArtistSearch('');
                        setShowArtistDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white text-sm ${
                        selectedArtist === artist.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''
                      }`}
                    >
                      {artist.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                {typeOptions.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};