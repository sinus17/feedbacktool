import React, { useState } from 'react';
import { ContentPlanCalendar } from '../components/ContentPlanCalendar';
import { useStore } from '../store';

export const ContentPlan: React.FC = () => {
  const { artists } = useStore();
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>(undefined);
  
  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Plan</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Schedule and manage content for all artists
          </p>
        </div>
        
        <div>
          <select
            value={selectedArtistId || ''}
            onChange={(e) => setSelectedArtistId(e.target.value || undefined)}
            className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Artists</option>
            {activeArtists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <ContentPlanCalendar artistId={selectedArtistId} />
    </div>
  );
};