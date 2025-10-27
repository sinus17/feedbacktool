import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ContentPlanCalendar } from '../components/ContentPlanCalendar';
import { useStore } from '../store';
import { Search, X, Filter } from 'lucide-react';

export const ContentPlan: React.FC = () => {
  const { artists } = useStore();
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>(undefined);
  const [artistSearch, setArtistSearch] = useState('');
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);
  
  // Get selected artist name
  const selectedArtistName = useMemo(() => {
    if (!selectedArtistId) return '';
    const artist = activeArtists.find(a => String(a.id) === String(selectedArtistId));
    return artist?.name || '';
  }, [selectedArtistId, activeArtists]);
  
  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!artistSearch.trim()) return activeArtists;
    const search = artistSearch.toLowerCase();
    return activeArtists.filter(artist => 
      artist.name.toLowerCase().includes(search)
    );
  }, [artistSearch, activeArtists]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowArtistDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Plan</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Schedule and manage content for all artists
          </p>
        </div>
        
        <div className="relative" ref={dropdownRef}>
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
                  setSelectedArtistId(undefined);
                }
              }}
              onFocus={() => setShowArtistDropdown(true)}
              placeholder="Search artists..."
              className="w-64 pl-10 pr-10 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {(selectedArtistId || artistSearch) && (
              <button
                onClick={() => {
                  setSelectedArtistId(undefined);
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
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto right-0">
              <button
                onClick={() => {
                  setSelectedArtistId(undefined);
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
                    setSelectedArtistId(String(artist.id));
                    setArtistSearch('');
                    setShowArtistDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white text-sm ${
                    String(selectedArtistId) === String(artist.id) ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''
                  }`}
                >
                  {artist.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Filter Button */}
        <div className="relative pl-2.5" ref={filterDropdownRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="btn-outline flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {selectedType && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-200 rounded-full">
                1
              </span>
            )}
          </button>
          
          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium dark:text-white">Filters</h3>
                  {selectedType && (
                    <button
                      onClick={() => setSelectedType('')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear all
                    </button>
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
                    <option value="song-specific">Song Specific</option>
                    <option value="off-topic">Off Topic</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ContentPlanCalendar artistId={selectedArtistId} />
    </div>
  );
};