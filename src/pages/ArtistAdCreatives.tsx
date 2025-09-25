import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, FileText, Trash2, Plus, HardDrive, Loader, MessageSquare } from 'lucide-react';
import { useStore } from '../store';
import { AdCreativeSubmissionModal } from '../components/AdCreativeSubmissionModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { format } from 'date-fns';
import { isSupabaseStorageUrl } from '../utils/video/player';

export const ArtistAdCreatives: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artists, adCreatives, fetchAdCreatives, fetchArtists, deleteAdCreative, loading } = useStore();
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    videoUrl: string;
    videoName?: string;
    platform: string;
    creativeId?: string;
  }>({
    isOpen: false,
    videoUrl: '',
    videoName: '',
    platform: '',
    creativeId: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    creativeId: string | null;
  }>({
    isOpen: false,
    creativeId: null,
  });
  
  const artist = artists.find(a => a.id === id);

  // Function to fetch artist-specific ad creatives
  const fetchArtistAdCreatives = useCallback(async () => {
    if (id) {
      console.log('ArtistAdCreatives: Fetching data for artist ID:', id);
      const filters = {
        artistId: id,
        status: undefined // Don't filter by status initially to see all creatives
      };
      await fetchAdCreatives(1, 1000, filters); // Fetch more records
    }
  }, [id, fetchAdCreatives]);

  useEffect(() => {
    fetchArtistAdCreatives().catch(console.error);
    fetchArtists().catch(console.error);
  }, [fetchArtistAdCreatives, fetchArtists]);

  // Watch for changes in adCreatives length and re-fetch if needed to maintain filtering
  const [lastCreativesCount, setLastCreativesCount] = useState(0);
  
  useEffect(() => {
    const currentCount = adCreatives.length;
    if (currentCount > lastCreativesCount && lastCreativesCount > 0) {
      // New creatives were added, re-fetch to maintain proper filtering
      setTimeout(() => {
        fetchArtistAdCreatives().catch(console.error);
      }, 100);
    }
    setLastCreativesCount(currentCount);
  }, [adCreatives.length, lastCreativesCount, fetchArtistAdCreatives]);

  // Debug: Find ad creatives that show "Florian Bunke" in admin view
  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };
  
  const florianNamedCreatives = adCreatives.filter(creative => 
    getArtistName(creative.artists_id) === 'Florian Bunke'
  );
  
  console.log('ArtistAdCreatives: Ad creatives showing as "Florian Bunke" in admin:', 
    florianNamedCreatives.length, 
    florianNamedCreatives.map(c => ({ 
      id: c.id, 
      artists_id: c.artists_id, 
      resolvedName: getArtistName(c.artists_id),
      content: c.content.substring(0, 50) + '...'
    }))
  );
  
  console.log('ArtistAdCreatives: Target artist ID:', id, 'vs actual artist IDs in Florian creatives:', 
    [...new Set(florianNamedCreatives.map(c => c.artists_id))]
  );

  const filteredCreatives = useMemo(() => {
    console.log('ArtistAdCreatives: Filtering creatives for artist ID:', id);
    console.log('ArtistAdCreatives: Total ad creatives in state:', adCreatives.length);
    
    // CRITICAL: Always filter by artist ID to prevent privacy leak
    // Even if server-side filtering was used, we must ensure client-side filtering as a safety net
    const filtered = adCreatives
      .filter(creative => {
        const belongsToArtist = String(creative.artists_id) === String(id);
        const notArchived = creative.status !== 'archived';
        const shouldInclude = belongsToArtist && notArchived;
        
        if (!belongsToArtist && creative.artists_id) {
          console.warn('ArtistAdCreatives: PRIVACY VIOLATION PREVENTED - Creative belongs to different artist:', {
            creativeId: creative.id,
            creativeArtistId: creative.artists_id,
            currentArtistId: id,
            content: creative.content?.substring(0, 50)
          });
        }
        
        return shouldInclude;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('ArtistAdCreatives: Final filtered creatives count for artist', id, ':', filtered.length);
    return filtered;
  }, [adCreatives, id]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.creativeId) {
      try {
        setDeletingId(deleteConfirmation.creativeId);
        await deleteAdCreative(deleteConfirmation.creativeId);
      } catch (error) {
        console.error('Failed to delete ad creative:', error);
      } finally {
        setDeletingId(null);
      }
    }
    setDeleteConfirmation({ isOpen: false, creativeId: null });
  };

  const handleRowClick = (creative: any, event: React.MouseEvent) => {
    // Don't open preview if clicking on buttons or links
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.tagName === 'A') {
      return;
    }

    // Only show preview for video content (dropbox and direct_upload)
    if (creative.platform === 'dropbox' || creative.platform === 'direct_upload') {
      setPreviewModal({
        isOpen: true,
        videoUrl: creative.content,
        videoName: creative.videoName,
        platform: creative.platform,
        creativeId: creative.id
      });
    }
  };
  
  const handleMessageClick = (creative: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Only show preview for video content (dropbox and direct_upload)
    if (creative.platform === 'dropbox' || creative.platform === 'direct_upload') {
      setPreviewModal({
        isOpen: true,
        videoUrl: creative.content,
        videoName: creative.videoName,
        platform: creative.platform,
        creativeId: creative.id
      });
    }
  };
  
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-6 w-6" fill="currentColor">
                <path d="M544 96C526.3 96 512 110.3 512 128L512 137.1L126.8 247.2C123 233.8 110.6 224 96 224C78.3 224 64 238.3 64 256L64 384C64 401.7 78.3 416 96 416C110.6 416 123 406.2 126.8 392.8L198.5 413.3C194.3 424.1 192 435.8 192 448C192 501 235 544 288 544C334.9 544 374 510.3 382.3 465.8L512 502.8L512 511.9C512 529.6 526.3 543.9 544 543.9C561.7 543.9 576 529.6 576 511.9L576 127.9C576 110.2 561.7 95.9 544 95.9zM335.8 452.5C333.5 476.9 313 496 288 496C261.5 496 240 474.5 240 448C240 440.3 241.8 433 245 426.6L335.8 452.5z"/>
              </svg>
              <span className="text-xl font-bold">Ad Creatives</span>
            </div>
            
            <div className="flex justify-between border-b border-white/20">
              <div className="flex space-x-4">
                <Link
                  to={`/artist/${id}`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                      <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z"/>
                    </svg>
                    <span>Videos</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/ad-creatives`}
                  className="pb-2 px-1 border-b-2 border-white text-white"
                >
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
                      <path d="M544 96C526.3 96 512 110.3 512 128L512 137.1L126.8 247.2C123 233.8 110.6 224 96 224C78.3 224 64 238.3 64 256L64 384C64 401.7 78.3 416 96 416C110.6 416 123 406.2 126.8 392.8L198.5 413.3C194.3 424.1 192 435.8 192 448C192 501 235 544 288 544C334.9 544 374 510.3 382.3 465.8L512 502.8L512 511.9C512 529.6 526.3 543.9 544 543.9C561.7 543.9 576 529.6 576 511.9L576 127.9C576 110.2 561.7 95.9 544 95.9zM335.8 452.5C333.5 476.9 313 496 288 496C261.5 496 240 474.5 240 448C240 440.3 241.8 433 245 426.6L335.8 452.5z"/>
                    </svg>
                    <span>Ad Creatives</span>
                  </div>
                </Link>
                <Link
                  to={`/artist/${id}/content-plan`}
                  className="pb-2 px-1 text-white/70 hover:text-white"
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
                  <span>Sheets</span>
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
                {artist.name}'s Ad Creatives ({filteredCreatives.length})
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage Instagram Reels and TikTok URLs
              </p>
            </div>
            <button onClick={() => setShowSubmissionModal(true)} className="btn">
              <Plus className="h-5 w-5 mr-2" />
              Add URLs
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredCreatives.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No ad creatives found
                      </td>
                    </tr>
                  ) : (
                    filteredCreatives.map((creative) => (
                      <tr 
                        key={creative.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          (creative.platform === 'dropbox' || creative.platform === 'direct_upload') 
                            ? 'cursor-pointer' 
                            : ''
                        }`}
                        onClick={(e) => handleRowClick(creative, e)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {creative.platform === 'instagram' ? (
                              <img 
                                src="https://swipeup-marketing.com/wp-content/uploads/2025/01/instagram-white-icon.png"
                                alt="Instagram"
                                className="h-5 w-5"
                              />
                            ) : creative.platform === 'dropbox' ? (
                              // Check if it's a Supabase storage URL or regular Dropbox
                              (creative.content.includes('://') && isSupabaseStorageUrl(creative.content)) ? (
                                <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                  {creative.thumbnail_url ? (
                                    <img 
                                      src={creative.thumbnail_url} 
                                      alt="Video thumbnail" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <HardDrive className="h-5 w-5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                              ) : (
                                <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                  {creative.thumbnail_url ? (
                                    <img 
                                      src={creative.thumbnail_url} 
                                      alt="Video thumbnail" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      viewBox="0 0 528 512"
                                      className="h-5 w-5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                    >
                                      <path fill="currentColor" d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z"/>
                                    </svg>
                                  )}
                                </div>
                              )
                            ) : (
                              <div className="flex items-center">
                                {(creative.content.includes('://') && isSupabaseStorageUrl(creative.content)) ? (
                                  <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                    {creative.thumbnail_url ? (
                                      <img 
                                        src={creative.thumbnail_url} 
                                        alt="Video thumbnail" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <HardDrive className="h-5 w-5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                    )}
                                  </div>
                                ) : (
                                  <img 
                                    src="https://swipeup-marketing.com/wp-content/uploads/2025/01/e19bb6a0396fdfff0220c982289ff11c.png"
                                    alt="TikTok"
                                    className="h-5 w-5"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {creative.videoName ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {creative.videoName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1 ml-4">
                                  <span className="text-gray-400">↳</span>
                                  <a
                                    href={creative.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px] text-xs text-gray-500 dark:text-gray-400"
                                    title={creative.content}
                                  >
                                    {creative.content}
                                  </a>
                                </div>
                                
                                {/* Show merged Instagram URL if available */}
                                {creative.mergedInstagramReelUrl && (
                                  <div className="flex items-center gap-1 mt-1 ml-4">
                                    <span className="text-gray-400">↳</span>
                                    <img 
                                      src="https://swipeup-marketing.com/wp-content/uploads/2025/01/instagram-white-icon.png"
                                      alt="Instagram"
                                      className="h-4 w-4"
                                    />
                                    <a
                                      href={creative.mergedInstagramReelUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline truncate block max-w-[200px] sm:max-w-[300px] md:max-w-full text-xs text-gray-500 dark:text-gray-400"
                                      title={creative.mergedInstagramReelUrl}
                                    >
                                      {creative.mergedInstagramReelUrl}
                                    </a>
                                  </div>
                                )}
                                
                                {/* Show merged TikTok auth code if available */}
                                {creative.mergedTiktokAuthCode && (
                                  <div className="flex items-center gap-1 mt-1 ml-4">
                                    <span className="text-gray-400">↳</span>
                                    <img 
                                      src="https://swipeup-marketing.com/wp-content/uploads/2025/01/e19bb6a0396fdfff0220c982289ff11c.png"
                                      alt="TikTok"
                                      className="h-4 w-4"
                                    />
                                    <span className="truncate block max-w-[200px] sm:max-w-[300px] md:max-w-full text-xs text-gray-500 dark:text-gray-400" title={creative.mergedTiktokAuthCode}>
                                      {creative.mergedTiktokAuthCode}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              creative.platform !== 'tiktok' ? (
                                <a
                                  className="flex items-center gap-2 hover:underline"
                                  href={creative.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={creative.content}
                                >
                                  {isSupabaseStorageUrl(creative.content) ? (
                                    <HardDrive className="h-4 w-4 text-white" />
                                  ) : creative.platform === 'dropbox' ? (
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      viewBox="0 0 528 512"
                                      className="h-4 w-4 text-gray-400"
                                    >
                                      <path fill="currentColor" d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z"/>
                                    </svg>
                                  ) : creative.platform === 'instagram' ? (
                                    <img 
                                      src="https://swipeup-marketing.com/wp-content/uploads/2025/01/instagram-white-icon.png"
                                      alt="Instagram"
                                      className="h-4 w-4"
                                    />
                                  ) : (
                                    <HardDrive className="h-4 w-4 text-white" />
                                  )}
                                  <span className="truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                                    {creative.content}
                                  </span>
                                </a>
                              ) : (
                                <span className="flex items-center gap-2" title={creative.content}>
                                  <img 
                                    src="https://swipeup-marketing.com/wp-content/uploads/2025/01/e19bb6a0396fdfff0220c982289ff11c.png"
                                    alt="TikTok"
                                    className="h-4 w-4"
                                  />
                                  <span className="truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">
                                    {creative.content.substring(0, 30)}...
                                  </span>
                                </span>
                              )
                            )}
                            
                            {/* Display merged Instagram URL if available */}
                            {creative.mergedInstagramReelUrl && !creative.videoName && (
                              <div className="flex items-center gap-1 mt-1 ml-4">
                                <span className="text-gray-400">↳</span>
                                <img 
                                  src="https://swipeup-marketing.com/wp-content/uploads/2025/01/instagram-white-icon.png"
                                  alt="Instagram" 
                                  className="h-4 w-4"
                                />
                                <a
                                  href={creative.mergedInstagramReelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer" 
                                  className="hover:underline truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px] text-xs text-gray-500 dark:text-gray-400"
                                  title={creative.mergedInstagramReelUrl}
                                >
                                  {creative.mergedInstagramReelUrl}
                                </a>
                              </div>
                            )}
                            
                            {/* Display merged TikTok auth code if available */}
                            {creative.mergedTiktokAuthCode && !creative.videoName && (
                              <div className="flex items-center gap-1 mt-1 ml-4">
                                <span className="text-gray-400">↳</span>
                                <img 
                                  src="https://swipeup-marketing.com/wp-content/uploads/2025/01/e19bb6a0396fdfff0220c982289ff11c.png"
                                  alt="TikTok"
                                  className="h-4 w-4"
                                />
                                <span className="truncate block max-w-[120px] sm:max-w-[150px] md:max-w-[200px] text-xs text-gray-500 dark:text-gray-400" title={creative.mergedTiktokAuthCode}>
                                  {creative.mergedTiktokAuthCode}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(creative.status)}`}>
                            {creative.status.charAt(0).toUpperCase() + creative.status.slice(1)}
                          </span>
                          {creative.status === 'rejected' && creative.rejectionReason && (
                            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                              {creative.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(creative.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleMessageClick(creative, e)}
                              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
                              title="View video"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmation({ isOpen: true, creativeId: creative.id });
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              disabled={deletingId === creative.id}
                            >
                              {deletingId === creative.id ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {showSubmissionModal && (
          <AdCreativeSubmissionModal 
            onClose={() => setShowSubmissionModal(false)}
            artistId={id}
          />
        )}

        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          title="Delete Ad Creative"
          message={
            deleteConfirmation.creativeId
              ? `Are you sure you want to delete this ad creative? This action cannot be undone.`
              : ''
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmation({ isOpen: false, creativeId: null })}
          isLoading={!!deletingId}
        />

        <VideoPreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal({ isOpen: false, videoUrl: '', videoName: '', platform: '', creativeId: '' })}
          videoUrl={previewModal.videoUrl}
          videoName={previewModal.videoName}
          platform={previewModal.platform}
          creativeId={previewModal.creativeId}
        />
      </main>
    </div>
  );
};