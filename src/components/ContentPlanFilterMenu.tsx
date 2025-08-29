import React from 'react';
import { Filter } from 'lucide-react';
import { useContentPlanStore } from '../store/contentPlanStore';
import { useStore } from '../store';

interface ContentPlanFilterMenuProps {
  artistId?: string;
}

export const ContentPlanFilterMenu: React.FC<ContentPlanFilterMenuProps> = ({ artistId }) => {
  const { setSelectedArtistId, fetchPosts } = useContentPlanStore();
  const { artists } = useStore();
  const [selectedArtist, setSelectedArtist] = React.useState(artistId || '');
  const [selectedType, setSelectedType] = React.useState('');
  
  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  const handleArtistChange = (id: string) => {
    setSelectedArtist(id);
    setSelectedArtistId(id || null);
    fetchPosts(id || undefined);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary-500" />
        <h3 className="text-lg font-medium dark:text-white">Filter Content Plan</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!artistId && (
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
        )}

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
  );
};