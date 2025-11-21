import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Plus, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { SubmissionForm } from '../components/SubmissionForm';
import { VideoList } from '../components/VideoList';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const PublicArtistView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { artists, submissions, fetchArtists, fetchSubmissions, fetchAdCreatives } = useStore();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('No artist ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch data in parallel with error handling
        const results = await Promise.allSettled([
          fetchArtists(),
          fetchSubmissions(1, 1000, { artistId: id, includeArchived: true }),
          fetchAdCreatives()
        ]);

        // Check if any critical fetch failed
        const artistsFetch = results[0];
        if (artistsFetch.status === 'rejected') {
          console.error('Failed to fetch artists:', artistsFetch.reason);
          setError('Failed to load artist data. Please try refreshing the page.');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading artist view:', err);
        setError('An unexpected error occurred. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, fetchArtists, fetchSubmissions, fetchAdCreatives]);

  const artist = artists.find(a => a.id === id);
  
  // Filter submissions for this artist
  const artistSubmissions = submissions.filter(submission => 
    String(submission.artistId) === String(id)
  );
  // Count only non-archived videos
  const videoCount = artistSubmissions.filter(submission => submission.status !== 'archived').length;

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Artist View
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while fetching artist data
  if (isLoading || (!artist && artists.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading artist data...</p>
        </div>
      </div>
    );
  }

  if (!artist && artists.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Artist not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The artist you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Back
          </button>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-6 w-6" fill="currentColor">
                <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z"/>
              </svg>
              <span className="text-xl font-bold">VideoFeedback</span>
            </div>
            
            <div className="flex justify-between border-b border-white/20">
              <div className="flex space-x-4">
                <Link
                  to={`/artist/${id}`}
                  className={`pb-2 px-1 ${
                    !location.pathname.includes('/ad-creatives') && !location.pathname.includes('/content-plan') && !location.pathname.includes('/release-sheets')
                      ? 'border-b-2 border-white text-white' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-6 w-6 sm:h-4 sm:w-4" fill="currentColor">
                      <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z"/>
                    </svg>
                    <span className="hidden sm:inline">Videos</span>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-6 w-6 sm:h-4 sm:w-4" fill="currentColor">
                      <path d="M544 96C526.3 96 512 110.3 512 128L512 137.1L126.8 247.2C123 233.8 110.6 224 96 224C78.3 224 64 238.3 64 256L64 384C64 401.7 78.3 416 96 416C110.6 416 123 406.2 126.8 392.8L198.5 413.3C194.3 424.1 192 435.8 192 448C192 501 235 544 288 544C334.9 544 374 510.3 382.3 465.8L512 502.8L512 511.9C512 529.6 526.3 543.9 544 543.9C561.7 543.9 576 529.6 576 511.9L576 127.9C576 110.2 561.7 95.9 544 95.9zM335.8 452.5C333.5 476.9 313 496 288 496C261.5 496 240 474.5 240 448C240 440.3 241.8 433 245 426.6L335.8 452.5z"/>
                    </svg>
                    <span className="hidden sm:inline">Ad Creatives</span>
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
                    <Calendar className="h-6 w-6 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Content Plan</span>
                  </div>
                </Link>
              </div>
              
              <Link
                to={`/artist/${id}/release-sheets`}
                className={`pb-2 px-1 ${
                  location.pathname.includes('/release-sheets')
                    ? 'border-b-2 border-white text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Sheets</span>
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
                {artist?.name || 'Loading...'}'s Videos ({videoCount})
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Submit and manage your video feedback
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn">
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">New Submission</span>
            </button>
          </div>

          <ErrorBoundary>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <VideoList artistId={id} isArtistView={true} />
            </div>
          </ErrorBoundary>
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