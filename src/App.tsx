import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertCircle, Loader, RefreshCw, ExternalLink } from 'lucide-react';
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
import { ReleaseSheets } from './pages/ReleaseSheets';
import Releases from './pages/Releases';
import { PreviewArtistView } from './pages/PreviewArtistView';
import { Library } from './pages/Library';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { PushNotifications } from './pages/PushNotifications';
import { NovelTest } from './pages/NovelTest';
import NewCampaignSubmission from './pages/NewCampaignSubmission';
import { ComponentLibrary } from './pages/ComponentLibrary';
import { URLShortener } from './pages/URLShortener';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { PublicLibraryRoute } from './components/PublicLibraryRoute';
import { useDarkMode } from './hooks/useDarkMode';
import { SnowEffect } from './components/SnowEffect';
import './styles/snow.css';

function App() {
  const [appInitialized, setAppInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const isInstagramBrowser = /Instagram/i.test(navigator.userAgent);
  useDarkMode();

  useEffect(() => {
    // Skip global data fetching - let each component load its own data
    console.log('🚀 App initialization - skipping global data fetch');
    setAppInitialized(true);
    
    // Show Instagram browser notice permanently - app should not be usable in Instagram
    if (isInstagramBrowser) {
      setShowInstagramModal(true);
    }
  }, [isInstagramBrowser]);
  
  // If Instagram browser is detected, only show the notice - don't render the app
  if (isInstagramBrowser && showInstagramModal) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto">
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl font-bold text-white">Instagram Browser Detected</h1>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <p className="text-gray-400 font-semibold">How to open in browser:</p>
              <ol className="text-gray-300 space-y-3 list-decimal list-inside">
                <li>Tap the <strong className="text-white">three dots</strong> (•••) in the top right corner</li>
                <li>Select <strong className="text-white">"Open in external browser"</strong></li>
              </ol>
              
              {/* Screenshot */}
              <div className="rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl">
                <img 
                  src="/IMG_3893.jpg" 
                  alt="Instagram browser menu showing 'Open in external browser' option"
                  className="w-full h-auto"
                />
              </div>
            </div>
            
            <button
              onClick={() => {
                const targetUrl = 'https://tool.swipeup-marketing.com/library?tab=feed&public=true';
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isAndroid = /Android/i.test(navigator.userAgent);
                
                if (isIOS) {
                  // Open in Safari on iOS
                  // Try x-safari-https first (iOS 13+)
                  window.location.href = `x-safari-https://tool.swipeup-marketing.com/library?tab=feed&public=true`;
                  
                  // Fallback to x-web-search
                  setTimeout(() => {
                    window.location.href = `x-web-search://?${targetUrl}`;
                  }, 500);
                } else if (isAndroid) {
                  // Open in Chrome on Android
                  window.location.href = `googlechrome://tool.swipeup-marketing.com/library?tab=feed&public=true`;
                  
                  // Fallback to intent
                  setTimeout(() => {
                    window.location.href = `intent://tool.swipeup-marketing.com/library?tab=feed&public=true#Intent;scheme=https;package=com.android.chrome;end`;
                  }, 500);
                } else {
                  // Generic fallback
                  window.open(targetUrl, '_blank');
                }
              }}
              className="w-full px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-3 font-semibold text-lg shadow-lg"
            >
              <ExternalLink className="h-6 w-6" />
              Open in Browser
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen while app initializes
  if (!appInitialized && !connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading VideoFeedback...</p>
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
        setConnectionError(false);
        setAppInitialized(true);
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
          <div className="min-h-screen bg-gray-50 dark:bg-[#000000] text-gray-900 dark:text-dark-100">
            <Routes>
              {/* Public routes */}
              <Route path="/artist/:id" element={<PublicArtistView />} />
              <Route path="/artist/:id/ad-creatives" element={<ArtistAdCreatives />} />
              <Route path="/artist/:id/content-plan" element={<ArtistContentPlan />} />
              <Route path="/artist/:id/release-sheets" element={<ArtistReleaseSheets />} />
              <Route path="/artist/:id/release-sheets/:sheetId" element={<ReleaseSheetEditor />} />
              <Route path="/artist/:id/release-sheets/:sheetId/edit" element={<ReleaseSheetEditor />} />
              <Route path="/release-sheets/templates/:templateId/edit" element={<ReleaseSheetEditor />} />
              <Route path="/release-sheets/components" element={<ComponentLibrary />} />
              <Route path="/novel-test" element={<NovelTest />} />
              <Route path="/preview/:id" element={<PreviewArtistView />} />
              <Route path="/new-campaign" element={<NewCampaignSubmission />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Library route - public when public=true parameter is present */}
              <Route 
                path="/library" 
                element={
                  <PublicLibraryRoute>
                    {(isPublic) => (
                      <div className="flex w-full h-screen">
                        {!isPublic && <Sidebar />}
                        <main className={`flex-1 overflow-auto ${isPublic ? 'w-full' : ''}`} style={{ backgroundColor: '#111111' }}>
                          <Library />
                        </main>
                      </div>
                    )}
                  </PublicLibraryRoute>
                } 
              />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <div className="flex w-full h-screen">
                      <Sidebar />
                      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#111111' }}>
                        <div className="w-full">
                          <Routes>
                            <Route index element={<Home />} />
                            <Route path="ad-creatives" element={<AdCreatives />} />
                            <Route path="content-plan" element={<ContentPlan />} />
                            <Route path="release-sheets" element={<ReleaseSheets />} />
                            <Route path="releases" element={<Releases />} />
                            <Route path="artists" element={<Artists />} />
                            <Route path="whatsapp" element={<WhatsAppLogs />} />
                            <Route path="archive" element={<Archive />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="notifications" element={<PushNotifications />} />
                            <Route path="url-shortener" element={<URLShortener />} />
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