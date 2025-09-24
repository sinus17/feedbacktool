import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Video, Instagram, Calendar, FileText } from 'lucide-react';
import { useStore } from '../store';
import { useContentPlanStore } from '../store/contentPlanStore';
import { ContentPlanCalendar } from '../components/ContentPlanCalendar';
import { useEffect } from 'react';

export const ArtistContentPlan: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artists, fetchArtists } = useStore();
  const { fetchPosts } = useContentPlanStore();
  
  const artist = artists.find(a => a.id === id);

  useEffect(() => {
    if (id) {
      fetchArtists().catch(console.error);
      fetchPosts().catch(console.error);
    }
  }, [id]);
  
  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Artist not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please check the URL and try again
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6" />
              <span className="text-xl font-bold">Content Plan</span>
            </div>
            
            <div className="flex justify-between border-b border-white/20">
              <div className="flex space-x-4">
                <Link
                  to={`/artist/${id}`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Video className="h-4 w-4" />
                    <span>Videos</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/ad-creatives`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Instagram className="h-4 w-4" />
                    <span>Ad Creatives</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/content-plan`}
                  className="pb-2 px-1 border-b-2 border-white text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Content Plan</span>
                  </div>
                </Link>
              </div>
              
              <Link
                to={`/artist/${id}/release-sheets`}
                className="pb-2 px-1 text-white/70 hover:text-white"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Release Sheets</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContentPlanCalendar artistId={id} />
      </main>
    </div>
  );
};