import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { checkSupabaseConnection } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { Home } from './pages/Home';
import { Artists } from './pages/Artists';
import { Settings } from './pages/Settings';
import { WhatsAppLogs } from './pages/WhatsAppLogs';
import { AdCreatives } from './pages/AdCreatives';
import { Archive } from './pages/Archive';
import { ContentPlan } from './pages/ContentPlan';
import { PublicArtistView } from './pages/PublicArtistView';
import { ArtistAdCreatives } from './pages/ArtistAdCreatives';
import { ArtistContentPlan } from './pages/ArtistContentPlan';
import { ArtistReleaseSheets } from './pages/ArtistReleaseSheets';
import { ReleaseSheetEditor } from './pages/ReleaseSheetEditor';
import { PreviewArtistView } from './pages/PreviewArtistView';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { useStore } from './store';
import { useDarkMode } from './hooks/useDarkMode';
import { SnowEffect } from './components/SnowEffect';
import './styles/snow.css';

function App() {
  const [appInitialized, setAppInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  useDarkMode();

  const { fetchArtists, fetchSubmissions } = useStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setInitError(null);
        
        // Fetch data directly without redundant connection checks
        await Promise.all([
          fetchArtists(),
          fetchSubmissions()
        ]);
        
        setAppInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize app');
        setConnectionError(true);
      }
    };

    initializeApp();
  }, [fetchArtists, fetchSubmissions]);

  // Show loading screen while app initializes
  if (!appInitialized && !connectionError && !initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading VideoFeedback...</p>
        </div>
      </div>
    );
  }

  // Show initialization error
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-bold">Initialization Error</h1>
          </div>
          <p className="text-gray-300 mb-6">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Show connection error
  const handleRetry = async () => {
    setIsReconnecting(true);
    try {
      const isConnected = await checkSupabaseConnection();
      if (isConnected) {
        await Promise.all([
          fetchArtists(),
          fetchSubmissions()
        ]);
        setConnectionError(false);
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-bold">Connection Error</h1>
          </div>
          <p className="text-gray-300 mb-6">
            Unable to connect to the server. Please check your internet connection and try again.
          </p>
          <button
            onClick={handleRetry}
            disabled={isReconnecting}
            className="w-full px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isReconnecting ? (
              <>
                <Loader className="animate-spin h-4 w-4" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Check if it's Christmas time (December)
  const isChristmasTime = new Date().getMonth() === 11;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          {isChristmasTime && <SnowEffect />}
          <div className="min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-dark-100">
            <Routes>
              {/* Public routes */}
              <Route path="/artist/:id" element={<PublicArtistView />} />
              <Route path="/artist/:id/ad-creatives" element={<ArtistAdCreatives />} />
              <Route path="/artist/:id/content-plan" element={<ArtistContentPlan />} />
              <Route path="/artist/:id/release-sheets" element={<ArtistReleaseSheets />} />
              <Route path="/artist/:id/release-sheets/:sheetId" element={<ReleaseSheetEditor />} />
              <Route path="/artist/:id/release-sheets/:sheetId/edit" element={<ReleaseSheetEditor />} />
              <Route path="/preview/:id" element={<PreviewArtistView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <div className="flex w-full h-screen">
                      <Sidebar />
                      <main className="flex-1 overflow-auto">
                        <div className="w-full p-4 sm:p-6 lg:p-8">
                          <Routes>
                            <Route index element={<Home />} />
                            <Route path="ad-creatives" element={<AdCreatives />} />
                            <Route path="content-plan" element={<ContentPlan />} />
                            <Route path="artists" element={<Artists />} />
                            <Route path="whatsapp" element={<WhatsAppLogs />} />
                            <Route path="archive" element={<Archive />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </div>
                      </main>
                    </div>
                  </PrivateRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;