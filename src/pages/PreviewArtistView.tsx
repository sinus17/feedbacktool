import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Video, Plus } from 'lucide-react';
import { useStore } from '../store';
import { SubmissionForm } from '../components/SubmissionForm';
import { VideoList } from '../components/VideoList';

export const PreviewArtistView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showForm, setShowForm] = useState(false);
  const { artists, submissions, fetchArtists, fetchSubmissions, loading, error } = useStore();
  const artist = artists.find(a => a.id === id);

  useEffect(() => {
    if (id) {
      fetchArtists().catch(console.error);
      fetchSubmissions(1, 1000, { artistId: id }).catch(console.error);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Artist not found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please check the URL and try again
          </p>
        </div>
      </div>
    );
  }

  const filteredSubmissions = submissions.filter(s => s.artistId === id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-primary-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-6 w-6" />
              <span className="text-xl font-bold">VideoFeedback</span>
            </div>
            <div className="text-sm bg-primary-600 px-3 py-1 rounded-full">
              Preview Mode
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold dark:text-white">
                {artist.name}'s Videos
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
            <VideoList artistId={artist.id} isArtistView={true} />
          </div>
        </div>

        {showForm && (
          <SubmissionForm 
            onClose={() => setShowForm(false)} 
            artistId={artist.id}
          />
        )}
      </main>
    </div>
  );
};