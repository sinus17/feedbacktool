import React, { useEffect, useState, useMemo } from 'react';
import { Copy, Trash2, Plus, Edit, Archive, HardDrive, Instagram } from 'lucide-react';
import { isSupabaseStorageUrl } from '../utils/video/player';
import { removeSpecificAdCreative } from '../utils/removeAdCreative';
import { normalizeString, stringContains } from '../utils/contentPlanMatcher';
import { useContentPlanStore } from '../store/contentPlanStore';
import { useStore } from '../store';
import { EditAdCreativeModal } from '../components/EditAdCreativeModal';
import { AdCreativeSubmissionModal } from '../components/AdCreativeSubmissionModal';
import { AdCreativesFilterMenu } from '../components/AdCreativesFilterMenu';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { Pagination } from '../components/Pagination';
import { format } from 'date-fns';
import { generateThumbnailFromUrl } from '../utils/video/generateThumbnailFromUrl';
import { supabase } from '../lib/supabase';

interface AdCreativesProps {
  artistId?: string;
}

export function AdCreatives({ artistId }: AdCreativesProps) {
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [modalInitialized, setModalInitialized] = useState(false);
  const [editingCreative, setEditingCreative] = useState<any>(null);
  const [selectedArtist, setSelectedArtist] = useState(artistId || '');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
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
  const [selectedCreatives, setSelectedCreatives] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState<{
    isOpen: boolean;
    count: number;
  }>({
    isOpen: false,
    count: 0,
  });
  const [bulkDeleteInput, setBulkDeleteInput] = useState('');
  const [isHoveringTable, setIsHoveringTable] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const { 
    adCreatives, 
    artists, 
    fetchAdCreatives, 
    fetchArtists, 
    deleteAdCreative, 
    updateAdCreativeStatus,
    archiveAdCreative,
    adCreativesPagination,
    setAdCreativesPage,
    loading 
  } = useStore();

  // Update selectedArtist when artistId prop changes
  useEffect(() => {
    if (artistId) {
      setSelectedArtist(artistId);
    }
  }, [artistId]);

  useEffect(() => {
    console.log('🎨 AdCreatives page - loading data');
    // Build filters object
    const filters = {
      artistId: artistId || selectedArtist || undefined,
      platform: selectedPlatform || undefined,
      status: selectedStatus || undefined
    };
    
    console.log('📊 Fetching ad creatives and artists...');
    // Fetch ad creatives with pagination and filters
    fetchAdCreatives(adCreativesPagination.currentPage, adCreativesPagination.pageSize, filters);
    fetchArtists();
    console.log('✅ AdCreatives data fetch initiated');
    
    // Only run cleanup once on mount
    if (!isInitialized) {
      setIsInitialized(true);
      setModalInitialized(true);
      
      // Remove the specific problematic ad creative
      removeSpecificAdCreative().then(result => {
        if (result.success) {
          console.log('Removed problematic ad creative');
          // Refresh the list after removal
          fetchAdCreatives(adCreativesPagination.currentPage, adCreativesPagination.pageSize, filters);
        }
      });
    }
  }, [adCreativesPagination.currentPage, adCreativesPagination.pageSize, artistId, selectedArtist, selectedPlatform, selectedStatus]);

  // Auto-generate thumbnails for videos without them
  useEffect(() => {
    const generateMissingThumbnails = async () => {
      // Find videos that need thumbnails
      const supabaseVideos = adCreatives.filter(creative => 
        creative.content && 
        isSupabaseStorageUrl(creative.content) && 
        !creative.thumbnail_url
      );

      const dropboxVideos = adCreatives.filter(creative =>
        creative.content &&
        creative.content.includes('dropbox.com') &&
        !creative.thumbnail_url
      );

      if (supabaseVideos.length === 0 && dropboxVideos.length === 0) return;

      console.log(`Found ${supabaseVideos.length} Supabase videos and ${dropboxVideos.length} Dropbox videos without thumbnails`);

      // Generate thumbnails for Supabase storage videos (client-side)
      for (const creative of supabaseVideos.slice(0, 3)) { // Limit to 3 at a time
        try {
          console.log(`Generating thumbnail for Supabase video ${creative.id}`);
          const thumbnailUrl = await generateThumbnailFromUrl(creative.content);
          
          if (thumbnailUrl) {
            await supabase
              .from('ad_creatives')
              .update({ 
                thumbnail_url: thumbnailUrl,
                updated_at: new Date().toISOString()
              } as any)
              .eq('id' as any, creative.id as any);
            
            console.log(`Thumbnail generated and saved for creative ${creative.id}`);
          }
        } catch (error) {
          console.error(`Error generating thumbnail for creative ${creative.id}:`, error);
        }
      }

      // Note: Dropbox thumbnails cannot be generated automatically due to CORS restrictions
      // They will be generated when the user previews the video
      if (dropboxVideos.length > 0) {
        console.log(`Found ${dropboxVideos.length} Dropbox videos without thumbnails. Thumbnails will be generated on first preview.`);
      }

      // Refresh the list to show new thumbnails
      const filters = {
        artistId: artistId || selectedArtist || undefined,
        platform: selectedPlatform || undefined,
        status: selectedStatus || undefined
      };
      fetchAdCreatives(adCreativesPagination.currentPage, adCreativesPagination.pageSize, filters);
    };

    // Only run if we have creatives loaded
    if (adCreatives.length > 0 && !loading) {
      generateMissingThumbnails();
    }
  }, [adCreatives.length]); // Run when creatives are loaded

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };
  
  const getArtistWhatsAppGroupId = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.whatsappGroupId || null;
  };

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

  const handleCopyContent = async (creative: any) => {
    try {
      // If this is an Instagram URL and we don't have a thumbnail yet, try to fetch it
      if (creative.platform === 'instagram' && !creative.instagram_thumbnail_url) {
        try {
          console.log('Fetching Instagram thumbnail for URL:', creative.content);
          // TODO: Implement fetchInstagramThumbnail function
          // fetchInstagramThumbnail(creative.content, creative.id)
          //   .then(() => fetchAdCreatives())
          //   .catch((error: any) => console.error('Error fetching Instagram thumbnail:', error));
        } catch (thumbnailError: any) {
          console.error('Error fetching Instagram thumbnail:', thumbnailError);
        }
      }
      
      await navigator.clipboard.writeText(creative.content);
      
      // If this is an Instagram URL and we don't have a thumbnail yet, try to fetch one
      if (creative.platform === 'instagram' && 
          !creative.instagram_thumbnail_url && 
          creative.content.includes('instagram.com')) {
        // This is now handled above
      }
      
      await updateAdCreativeStatus(creative.id, 'active');
      
      // Send WhatsApp notification if it's a Supabase storage URL
      if (isSupabaseStorageUrl(creative.content)) {
        try {
          const artistId = creative.artists_id;
          const artistName = getArtistName(artistId);
          const artistGroupId = getArtistWhatsAppGroupId(artistId);
          const videoName = creative.videoName || 'Video';
          
          // Import WhatsAppService dynamically to avoid circular dependencies
          const { WhatsAppService } = await import('../services/whatsapp');
          
          // Send notification
          await WhatsAppService.notifyAdCreativeUpdate({
            artistName,
            artistId,
            artistGroupId,
            platform: creative.platform,
            content: creative.content,
            status: 'active',
            videoName: videoName
          });
          
          console.log('✅ WhatsApp notification sent for ad creative approval');
        } catch (notifyError) {
          console.error('❌ Error sending WhatsApp notification:', notifyError);
        }
      }
      
      // Force re-render by updating a state that doesn't affect filtering
      setIsInitialized(prev => !prev);
    } catch (err: any) {
      console.error('Error copying content:', err);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.creativeId) {
      try {
        await deleteAdCreative(deleteConfirmation.creativeId);
      } catch (error: any) {
        console.error('Error deleting ad creative:', error);
      }
    }
    setDeleteConfirmation({ isOpen: false, creativeId: null });
  };

  const handleBulkDelete = async () => {
    if (parseInt(bulkDeleteInput) !== selectedCreatives.size) {
      return;
    }

    try {
      // Delete all selected creatives
      await Promise.all(
        Array.from(selectedCreatives).map(id => deleteAdCreative(id))
      );
      
      // Clear selection and close modal
      setSelectedCreatives(new Set());
      setBulkDeleteConfirmation({ isOpen: false, count: 0 });
      setBulkDeleteInput('');
    } catch (error: any) {
      console.error('Error deleting ad creatives:', error);
    }
  };

  const toggleSelectCreative = (id: string, index: number, shiftKey: boolean = false) => {
    const newSelected = new Set(selectedCreatives);
    
    if (shiftKey && lastSelectedIndex !== null) {
      // Shift-click: select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        newSelected.add(filteredCreatives[i].id);
      }
    } else {
      // Normal click: toggle single item
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }
    
    setSelectedCreatives(newSelected);
    setLastSelectedIndex(index);
  };

  const toggleSelectAll = () => {
    if (selectedCreatives.size === filteredCreatives.length) {
      setSelectedCreatives(new Set());
    } else {
      setSelectedCreatives(new Set(filteredCreatives.map(c => c.id)));
    }
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteConfirmation({
      isOpen: true,
      count: selectedCreatives.size,
    });
    setBulkDeleteInput('');
  };

  const handleArchive = async (creative: { id: string; status: string }) => {
    try {
      await archiveAdCreative(creative.id);
      // Force re-render by updating a state that doesn't affect filtering
      setIsInitialized(prev => !prev);
    } catch (err: any) {
      console.error('Error archiving creative:', err);
    }
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

  const filteredCreatives = useMemo(() => {
    // Since filtering is now done server-side, we just need to sort the results
    let filtered = [...adCreatives];

    // Get content plan posts to determine order
    const contentPlanStore = useContentPlanStore.getState();
    const contentPlanPosts = contentPlanStore.posts;
    
    // Create a map of video names to their scheduled dates
    const scheduledVideos = new Map();
    contentPlanPosts.forEach(post => {
      // Only add to map if both title and start date exist
      if (post.title && post.start) {
        // Store with normalized name for consistent matching
        scheduledVideos.set(normalizeString(post.title), post.start);
      }
    });
    
    // Sort by scheduled date in content plan first, then by creation date
    filtered.sort((a, b) => {
      // Check if videos are in content plan
      const aVideoName = normalizeString(a.videoName);
      const bVideoName = normalizeString(b.videoName);
      
      // Find exact matches first
      let aScheduledDate = scheduledVideos.get(aVideoName);
      let bScheduledDate = scheduledVideos.get(bVideoName);
      
      // If no exact match, try to find partial matches
      if (!aScheduledDate && aVideoName) {
        for (const [title, date] of scheduledVideos.entries()) {
          if (stringContains(title, aVideoName) || stringContains(aVideoName, title)) {
            aScheduledDate = date;
            break;
          }
        }
      }
      
      if (!bScheduledDate && bVideoName) {
        for (const [title, date] of scheduledVideos.entries()) {
          if (stringContains(title, bVideoName) || stringContains(bVideoName, title)) {
            bScheduledDate = date;
            break;
          }
        }
      }
      
      const aInContentPlan = !!aScheduledDate;
      const bInContentPlan = !!bScheduledDate;
      
      // If both are in content plan, sort by scheduled date
      if (aInContentPlan && bInContentPlan) {
        const aDate = aScheduledDate.getTime();
        const bDate = bScheduledDate.getTime();
        return aDate - bDate; // Sort by scheduled date (earlier first)
      }
      
      // If only one is in content plan, prioritize it
      if (aInContentPlan) return -1;
      if (bInContentPlan) return 1;
      
      // Otherwise, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [adCreatives, isInitialized]);

  // Determine if we're in artist view
  const isArtistView = !!artistId;

  // Check if any filter is active (required for bulk selection)
  const hasActiveFilter = !!(selectedArtist || selectedPlatform || selectedStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold dark:text-white">
            {isArtistView ? `${getArtistName(artistId)}'s Ad Creatives` : 'Ad Creatives'}
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

      {/* Only show filter menu in admin view */}
      {!isArtistView && (
        <AdCreativesFilterMenu
          selectedArtist={selectedArtist}
          setSelectedArtist={setSelectedArtist}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
        />
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Bulk actions bar */}
        {!isArtistView && hasActiveFilter && selectedCreatives.size > 0 && (
          <div className="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
              {selectedCreatives.size} ad creative{selectedCreatives.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        )}
        <div 
          className="overflow-x-auto"
          onMouseEnter={() => setIsHoveringTable(true)}
          onMouseLeave={() => setIsHoveringTable(false)}
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {!isArtistView && hasActiveFilter && (
                  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-all duration-200 ${
                    isHoveringTable || selectedCreatives.size > 0 ? 'w-12 opacity-100' : 'w-0 opacity-0 px-0'
                  }`}>
                    {(isHoveringTable || selectedCreatives.size > 0) && (
                      <input
                        type="checkbox"
                        checked={selectedCreatives.size === filteredCreatives.length && filteredCreatives.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                      />
                    )}
                  </th>
                )}
                {!isArtistView && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Artist
                  </th>
                )}
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
                  <td colSpan={isArtistView ? 5 : (hasActiveFilter ? 7 : 6)} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredCreatives.length === 0 ? (
                <tr>
                  <td colSpan={isArtistView ? 5 : (hasActiveFilter ? 7 : 6)} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {(selectedArtist || selectedPlatform || selectedStatus) ? 'No ad creatives match the selected filters' : 'No ad creatives found'}
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
                    } ${
                      selectedCreatives.has(creative.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={(e) => handleRowClick(creative, e)}
                  >
                    {!isArtistView && hasActiveFilter && (
                      <td 
                        className={`px-6 py-4 whitespace-nowrap transition-all duration-200 ${
                          isHoveringTable || selectedCreatives.size > 0 ? 'w-12 opacity-100' : 'w-0 opacity-0 px-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(isHoveringTable || selectedCreatives.size > 0) && (
                          <input
                            type="checkbox"
                            checked={selectedCreatives.has(creative.id)}
                            onChange={() => {}}
                            onClick={(e) => {
                              const index = filteredCreatives.findIndex(c => c.id === creative.id);
                              toggleSelectCreative(creative.id, index, e.shiftKey);
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                          />
                        )}
                      </td>
                    )}
                    {!isArtistView && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {getArtistName(creative.artists_id)}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {creative.platform === 'instagram' ? (
                          <Instagram className="h-5 w-5 text-white" /> 
                        ) : creative.platform === 'dropbox' ? (
                          // Check if it's a Supabase storage URL or regular Dropbox
                          (creative.content.includes('://') && isSupabaseStorageUrl(creative.content)) ? (
                            creative.thumbnail_url ? (
                              <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                <img 
                                  src={creative.thumbnail_url} 
                                  alt="Video thumbnail" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <HardDrive className="h-5 w-5 text-white" />
                            )
                          ) : (
                            creative.thumbnail_url ? (
                              <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                <img 
                                  src={creative.thumbnail_url} 
                                  alt="Video thumbnail" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 528 512"
                                className="h-5 w-5 text-white"
                              >
                                <path fill="currentColor" d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z"/>
                              </svg>
                            )
                          )
                        ) : (
                          <div className="flex items-center">
                            {(creative.content.includes('://') && isSupabaseStorageUrl(creative.content)) ? (
                              creative.thumbnail_url ? (
                                <div className="relative w-10 h-10 bg-gray-800 rounded overflow-hidden">
                                  <img 
                                    src={creative.thumbnail_url} 
                                    alt="Video thumbnail" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <HardDrive className="h-5 w-5 text-white" />
                              )
                            ) : (
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="currentColor"
                                className="h-5 w-5 text-white"
                              >
                                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {creative.videoName ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {creative.videoName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 ml-4">
                              <span className="text-gray-400">↳</span>
                              <a
                                className={`flex items-center gap-2 hover:underline truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400 ${
                                  creative.platform === 'instagram' ? 'relative group' : ''
                                }`}
                                href={creative.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={creative.content}
                              >
                                {isSupabaseStorageUrl(creative.content) ? (
                                  <span className="truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400">
                                    {creative.content}
                                  </span>
                                ) : (
                                  <span className="truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400">
                                    {creative.content}
                                  </span>
                                )}
                              </a>
                              
                              {/* Instagram thumbnail preview on hover */}
                              {creative.platform === 'instagram' && (
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                                  {creative.instagram_thumbnail_url ? (
                                    <div className="bg-gray-900 rounded-md p-1 shadow-lg">
                                      <img 
                                        src={creative.instagram_thumbnail_url} 
                                        alt="Instagram thumbnail" 
                                        className="w-32 h-auto rounded"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-gray-900 text-gray-200 rounded-md p-2 shadow-lg text-xs">
                                      No thumbnail available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Display merged Instagram URL if available */}
                            {creative.mergedInstagramReelUrl && (
                              <div className="flex items-center gap-1 mt-1 ml-4">
                                <span className="text-gray-400">↳</span>
                                <Instagram className="h-4 w-4 text-white" />
                                <div className="relative group">
                                  <a
                                    href={creative.mergedInstagramReelUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400"
                                    title={creative.mergedInstagramReelUrl}
                                  >
                                    {creative.mergedInstagramReelUrl}
                                  </a>
                                  
                                  {/* Instagram thumbnail preview on hover */}
                                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                                    {creative.instagram_thumbnail_url ? (
                                      <div className="bg-gray-900 rounded-md p-1 shadow-lg">
                                        <img 
                                          src={creative.instagram_thumbnail_url} 
                                          alt="Instagram thumbnail" 
                                          className="w-32 h-auto rounded"
                                        />
                                      </div>
                                    ) : (
                                      <div className="bg-gray-900 text-gray-200 rounded-md p-2 shadow-lg text-xs">
                                        No thumbnail available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Display merged TikTok auth code if available */}
                            {creative.mergedTiktokAuthCode && (
                              <div className="flex items-center gap-1 mt-1 ml-4">
                                <span className="text-gray-400">↳</span>
                                <svg 
                                  viewBox="0 0 24 24" 
                                  fill="currentColor"
                                  className="h-4 w-4 text-white"
                                >
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                                <span className="truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400" title={creative.mergedTiktokAuthCode}>
                                  {creative.mergedTiktokAuthCode}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          creative.platform !== 'tiktok' ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={creative.content}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={`hover:underline truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] ${
                                  creative.platform === 'instagram' ? 'relative group' : ''
                                }`}
                                title={creative.content}
                              >
                                {creative.content}
                                
                                {/* Instagram thumbnail preview on hover */}
                                {creative.platform === 'instagram' && (
                                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                                    {creative.instagram_thumbnail_url ? (
                                      <div className="bg-gray-900 rounded-md p-1 shadow-lg">
                                        <img 
                                          src={creative.instagram_thumbnail_url} 
                                          alt="Instagram thumbnail" 
                                          className="w-32 h-auto rounded"
                                        />
                                      </div>
                                    ) : (
                                      <div className="bg-gray-900 text-gray-200 rounded-md p-2 shadow-lg text-xs">
                                        No thumbnail available
                                      </div>
                                    )}
                                  </div>
                                )}
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px]" title={creative.content}>
                                {creative.content}
                              </span>
                            </div>
                          )
                        )}
                        
                        {/* Display merged Instagram URL if available */}
                        {creative.mergedInstagramReelUrl && !creative.videoName && (
                          <div className="flex items-center gap-1 mt-1 ml-4">
                            <span className="text-gray-400">↳</span>
                            <Instagram className="h-4 w-4 text-white" />
                            <a
                              href={creative.mergedInstagramReelUrl}
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="hover:underline truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400 relative group"
                              title={creative.mergedInstagramReelUrl}
                            >
                              {creative.mergedInstagramReelUrl}
                              
                              {/* Instagram thumbnail preview on hover */}
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                                {creative.instagram_thumbnail_url ? (
                                  <div className="bg-gray-900 rounded-md p-1 shadow-lg">
                                    <img 
                                      src={creative.instagram_thumbnail_url} 
                                      alt="Instagram thumbnail" 
                                      className="w-32 h-auto rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-gray-900 text-gray-200 rounded-md p-2 shadow-lg text-xs">
                                    No thumbnail available
                                  </div>
                                )}
                              </div>
                            </a>
                          </div>
                        )}
                        
                        {/* Display merged TikTok auth code if available */}
                        {creative.mergedTiktokAuthCode && !creative.videoName && (
                          <div className="flex items-center gap-1 mt-1 ml-4">
                            <span className="text-gray-400">↳</span>
                            <svg 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                              className="h-4 w-4 text-white"
                            >
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                            <span className="truncate block max-w-[150px] sm:max-w-[200px] md:max-w-[250px] text-xs text-gray-500 dark:text-gray-400" title={creative.mergedTiktokAuthCode}>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(creative.createdAt), 'dd/MM/yy, HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleCopyContent(creative)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title="Copy Content"
                        >
                          <Copy className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingCreative(creative)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title="Edit Content"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleArchive(creative)}
                          className={`${
                            creative.status === 'archived'
                              ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                              : 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
                          } transition-colors`}
                          title={creative.status === 'archived' ? 'Unarchive' : 'Archive'}
                        >
                          <Archive className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation({
                            isOpen: true,
                            creativeId: creative.id
                          })}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isArtistView && (
          <Pagination
            currentPage={adCreativesPagination.currentPage}
            totalPages={adCreativesPagination.totalPages}
            totalCount={adCreativesPagination.totalCount}
            pageSize={adCreativesPagination.pageSize}
            onPageChange={(page) => {
              setAdCreativesPage(page);
              // Build filters object for pagination
              const filters = {
                artistId: artistId || selectedArtist || undefined,
                platform: selectedPlatform || undefined,
                status: selectedStatus || undefined
              };
              fetchAdCreatives(page, adCreativesPagination.pageSize, filters);
            }}
            loading={loading}
          />
        )}
      </div>

      {showSubmissionModal && modalInitialized && (
        <AdCreativeSubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          artistId={selectedArtist}
        />
      )}

      {editingCreative && (
        <EditAdCreativeModal
          creative={editingCreative}
          onClose={() => setEditingCreative(null)}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Ad Creative"
        message="Are you sure you want to delete this ad creative? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, creativeId: null })}
      />

      {/* Bulk delete confirmation modal */}
      {bulkDeleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Multiple Ad Creatives
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are about to delete <strong>{bulkDeleteConfirmation.count}</strong> ad creative{bulkDeleteConfirmation.count !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To confirm, please enter the number of ad creatives you want to delete:
            </p>
            <input
              type="number"
              value={bulkDeleteInput}
              onChange={(e) => setBulkDeleteInput(e.target.value)}
              placeholder={`Enter ${bulkDeleteConfirmation.count}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setBulkDeleteConfirmation({ isOpen: false, count: 0 });
                  setBulkDeleteInput('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={parseInt(bulkDeleteInput) !== bulkDeleteConfirmation.count}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete {bulkDeleteConfirmation.count} Ad Creative{bulkDeleteConfirmation.count !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        videoUrl={previewModal.videoUrl}
        videoName={previewModal.videoName}
        platform={previewModal.platform}
        creativeId={previewModal.creativeId}
      />
    </div>
  );
}