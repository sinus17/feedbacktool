import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Video, Plus, Instagram, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { SubmissionForm } from '../components/SubmissionForm';
import { VideoList } from '../components/VideoList';

export const PublicArtistView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showForm, setShowForm] = useState(false);
  const { artists, fetchArtists, fetchSubmissions, fetchAdCreatives } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (id) {
      fetchArtists();
      fetchSubmissions(1, 1000, { artistId: id }).catch(console.error);
      fetchAdCreatives();
    }
  }, [id]);

  const artist = artists.find(a => a.id === id);

  // Show loading state while fetching artist data
  if (!artist && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!artist && artists.length > 0) {
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
              <Video className="h-6 w-6" />
              <span className="text-xl font-bold">VideoFeedback</span>
            </div>
            
            <div className="flex space-x-4 border-b border-white/20">
              <Link
                to={`/artist/${id}`}
                className={`pb-2 px-1 ${
                  !location.pathname.includes('/ad-creatives') && !location.pathname.includes('/content-plan')
                    ? 'border-b-2 border-white text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span>Videos</span>
                </div>
              </Link>
              <Link
                to={`/artist/${id}/ad-creatives`}
                className={`pb-2 px-1 ${
                  location.pathname.includes('/ad-creatives')
                    ? 'border-b-2 border-white text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Instagram className="h-4 w-4" />
                  <span>Ad Creatives</span>
                </div>
              </Link>
              <Link
                to={`/artist/${id}/content-plan`}
                className={`pb-2 px-1 ${
                  location.pathname.includes('/content-plan')
                    ? 'border-b-2 border-white text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Content Plan</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold dark:text-white">
                {artist?.name || 'Loading...'}'s Videos
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Submit and manage your video feedback
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn">
              <Plus className="h-5 w-5 mr-2" />
              New Submission
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <VideoList artistId={id} isArtistView={true} />
          </div>
        </div>

        {showForm && (
          <SubmissionForm 
            onClose={() => setShowForm(false)} 
            artistId={id}
          />
        )}
      </main>
    </div>
  );
};