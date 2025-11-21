import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Edit, Download, Archive, MoveRight, Loader, ChevronRight, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { FeedbackModal } from './FeedbackModal';
import { EditVideoModal } from './EditVideoModal';
import { ConfirmationModal } from './ConfirmationModal';
import { AdTagIcon } from './icons/AdTagIcon';
import { formatDateToDDMMYY } from '../utils/dateFormat';
import type { VideoSubmission } from '../types';

interface VideoListProps {
  artistId?: string;
  isArtistView?: boolean;
  filters?: {
    artistId?: string;
    type?: string;
    status?: string;
  };
}

export const VideoList: React.FC<VideoListProps> = ({ artistId, filters = {}, isArtistView = false }) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoSubmission | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoSubmission | null>(null);
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  
  const { 
    submissions, 
    artists, 
    deleteSubmission, 
    updateSubmission, 
    fetchAdCreatives, 
    adCreatives,
    handleMoveToAdCreatives,
    fetchSubmissions,
    submissionsPagination
  } = useStore();
  
  // Ensure ad creatives are loaded
  useEffect(() => {
    fetchAdCreatives();
  }, [fetchAdCreatives]);
  
  // Define status order for default sorting
  const statusOrder = {
    'correction-needed': 0,
    'new': 1,
    'feedback-needed': 2,
    'ready': 3,
    'planned': 4,
    'posted': 5,
    'archived': 6
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    videoId: string | null;
    videoName: string;
  }>({
    isOpen: false,
    videoId: null,
    videoName: '',
  });
  const [movingVideos, setMovingVideos] = useState<Set<string>>(new Set());

  const getArtistName = (artistId: string | number) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  const handleArchive = async (submission: VideoSubmission) => {
    try {
      // Update submission status
      await updateSubmission(
        submission.id.toString(),
        { 
          status: submission.status === 'archived' ? 'new' : 'archived'
        },
        true // Skip WhatsApp notification
      );

      // Refresh submissions to update the list (especially for artist view)
      if (isArtistView && artistId) {
        await fetchSubmissions(1, 1000, { artistId, includeArchived: true }, true);
      } else if (filters) {
        await fetchSubmissions(
          submissionsPagination.currentPage,
          submissionsPagination.pageSize,
          filters,
          true
        );
      }
    } catch (error) {
      console.error('Failed to archive video:', error);
    }
  };

  const handleDownload = (videoUrl: string) => {
    // Add video to downloading state
    setDownloadingVideos(prev => new Set(prev).add(videoUrl));
    
    try {
      // Extract filename from URL for better download naming
      let filename = 'video.mp4';
      try {
        const urlPath = new URL(videoUrl).pathname;
        const pathParts = urlPath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          filename = lastPart;
        }
      } catch {
        // Use default filename if URL parsing fails
      }
      
      // Use Edge Function to force download with proper headers
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const downloadUrl = `${supabaseUrl}/functions/v1/force-download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(filename)}`;
      
      // Fetch with authorization header to trigger download
      fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Remove from downloading state
        setDownloadingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoUrl);
          return newSet;
        });
      })
      .catch(error => {
        console.error('Error downloading via Edge Function:', error);
        
        // Remove from downloading state
        setDownloadingVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(videoUrl);
          return newSet;
        });
        
        // Fallback to direct URL if Edge Function fails
        try {
          const processedUrl = videoUrl.includes('dropbox.com') 
            ? (() => {
                const urlObj = new URL(videoUrl);
                urlObj.searchParams.set('dl', '1');
                return urlObj.toString();
              })()
            : videoUrl;
          window.open(processedUrl, '_blank', 'noopener,noreferrer');
        } catch (fallbackError) {
          console.error('Error processing video URL:', fallbackError);
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
        }
      });
    } catch (error) {
      console.error('Error in download handler:', error);
      
      // Remove from downloading state
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoUrl);
        return newSet;
      });
      
      // Final fallback
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation.videoId) {
      try {
        await deleteSubmission(deleteConfirmation.videoId);
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
    setDeleteConfirmation({
      isOpen: false,
      videoId: null,
      videoName: '',
    });
  };

  const onMoveToAdCreatives = async (submission: VideoSubmission) => {
    try {
      // Add video to moving state
      const submissionId = submission.id.toString();
      setMovingVideos(prev => new Set(prev).add(submissionId));
      
      // Use the store method to handle the move
      await handleMoveToAdCreatives(submission);
      
      // Remove from moving state
      setMovingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    } catch (error) {
      console.error('Error moving video to ad creatives:', error);
      // Remove from moving state
      const submissionId = submission.id.toString();
      setMovingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };
  // Filter submissions based on all criteria including archived status
  const isVideoInAdCreatives = (videoUrl: string) => {
    return adCreatives.some(creative => creative.content === videoUrl);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    // Apply artist filter if provided (both artistId prop and filters.artistId)
    if (artistId && sub.artistId !== artistId) {
      return false;
    }
    
    if (filters.artistId && sub.artistId !== filters.artistId) {
      return false;
    }
    
    // For both artist and admin view:
    // Note: archived videos are already filtered out in the database query (store.ts)
    // unless explicitly filtered for them, so we don't need to filter them again here
    
    // Apply type and status filters if provided
    if (filters.type && sub.type !== filters.type) {
      return false;
    }
    
    if (filters.status && sub.status !== filters.status) {
      return false;
    }
    
    return true;
  });
  
  // Sort submissions by status (if no filters) or date
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    // If no filters are applied, sort by status order
    if (!filters.type && !filters.status && artistId) {
      const statusCompare = (statusOrder[a.status] ?? 999) - (statusOrder[b.status] ?? 999);
      if (statusCompare !== 0) return statusCompare;
      
      // If status is the same, sort by date within each status group
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Always newest first for now
    }
    
    // Otherwise sort by date as before
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Always newest first for now
  });

  const getStatusBadgeClass = (status: VideoSubmission['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'feedback-needed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'correction-needed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case 'ready':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200';
      case 'planned':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'posted':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: VideoSubmission['status']) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'feedback-needed':
        return 'Feedback Needed';
      case 'correction-needed':
        return 'Correction Needed';
      case 'ready':
        return 'Ready';
      case 'planned':
        return 'Planned';
      case 'posted':
        return 'Posted';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  const getStatusHeaderClass = (status: VideoSubmission['status']) => {
    const baseClasses = 'border-l-4';
    switch (status) {
      case 'new':
        return `${baseClasses} bg-blue-500/20 border-blue-500`;
      case 'feedback-needed':
        return `${baseClasses} bg-yellow-500/20 border-yellow-500`;
      case 'correction-needed':
        return `${baseClasses} bg-red-500/20 border-red-500`;
      case 'ready':
        return `${baseClasses} bg-emerald-500/20 border-emerald-500`;
      case 'planned':
        return `${baseClasses} bg-green-500/20 border-green-500`;
      case 'posted':
        return `${baseClasses} bg-purple-500/20 border-purple-500`;
      case 'archived':
        return `${baseClasses} bg-gray-500/20 border-gray-500`;
      default:
        return `${baseClasses} bg-gray-500/20 border-gray-500`;
    }
  };

  const getStatusTextColor = (status: VideoSubmission['status']) => {
    switch (status) {
      case 'new':
        return 'text-blue-300';
      case 'feedback-needed':
        return 'text-yellow-300';
      case 'correction-needed':
        return 'text-red-300';
      case 'ready':
        return 'text-emerald-300';
      case 'planned':
        return 'text-green-300';
      case 'posted':
        return 'text-purple-300';
      case 'archived':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  // Group submissions by status (including archived separately)
  const groupedSubmissions = sortedSubmissions.reduce((groups, submission) => {
    const status = submission.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(submission);
    return groups;
  }, {} as Record<string, VideoSubmission[]>);

  // Get ordered status keys that have videos (excluding archived)
  const orderedStatusKeys = (Object.keys(statusOrder) as VideoSubmission['status'][])
    .filter(status => status !== 'archived' && groupedSubmissions[status]?.length > 0)
    .sort((a, b) => statusOrder[a] - statusOrder[b]);

  // Get archived videos separately
  const archivedVideos = groupedSubmissions['archived'] || [];
  const hasArchivedVideos = archivedVideos.length > 0;

  // Safety check for submissions array
  if (!Array.isArray(submissions)) {
    console.error('VideoList: submissions is not an array', submissions);
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
        <p className="text-gray-400">Unable to load video submissions. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Video Name
              </th>
              {!artistId && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Artist
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Content Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Uploaded At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Updated At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
          {filteredSubmissions.length === 0 ? (
            <tr>
              <td colSpan={artistId ? 6 : 7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                No video submissions found
              </td>
            </tr>
          ) : (
            orderedStatusKeys.map((status) => (
              <React.Fragment key={status}>
                {/* Status Group Header */}
                <tr className={getStatusHeaderClass(status as VideoSubmission['status'])}>
                  <td colSpan={artistId ? 6 : 7} className="px-6 py-2">
                    <div className={`text-sm font-medium ${getStatusTextColor(status as VideoSubmission['status'])}`}>
                      {getStatusLabel(status as VideoSubmission['status'])} ({groupedSubmissions[status].length})
                    </div>
                  </td>
                </tr>
                {/* Videos in this status group */}
                {groupedSubmissions[status].map((submission) => (
              <tr key={submission.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white w-3/5 truncate">
                    {submission.projectName}
                  </div>
                </td>
                {!artistId && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {getArtistName(submission.artistId)}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300 capitalize">
                    {submission.type.replace('-', ' ')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(submission.status)}`}>
                      {submission.status.replace(/-/g, ' ')}
                    </span>
                    {submission.status === 'ready' && submission.type === 'song-specific' && (
                      isVideoInAdCreatives(submission.videoUrl) ? (
                        <div
                          className="text-green-500 dark:text-green-400"
                          title="Already in Ad Creatives"
                        >
                          <AdTagIcon />
                        </div>
                      ) : movingVideos.has(submission.id.toString()) ? (
                        <div
                          className="text-blue-500 dark:text-blue-400"
                          title="Moving to Ad Creatives..."
                        >
                          <Loader className="h-4 w-4 animate-spin" />
                        </div>
                      ) : !isArtistView && (
                        <button
                          onClick={() => onMoveToAdCreatives(submission)}
                          className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title="Move to Ad Creatives"
                        >
                          <MoveRight className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">
                    {formatDateToDDMMYY(submission.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-400">
                    {formatDateToDDMMYY(submission.updatedAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedVideo(submission)}
                      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      title="Give Feedback"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(submission.videoUrl)}
                      disabled={downloadingVideos.has(submission.videoUrl)}
                      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      title="Download Video"
                    >
                      {downloadingVideos.has(submission.videoUrl) ? (
                        <Loader className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingVideo(submission)}
                      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      title="Edit Video"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleArchive(submission)}
                      className={`transition-colors ${
                        submission.status === 'archived'
                          ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                          : 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
                      }`}
                      title={submission.status === 'archived' ? 'Unarchive Video' : 'Archive Video'}
                    >
                      <Archive className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation({
                        isOpen: true,
                        videoId: submission.id.toString(),
                        videoName: submission.projectName,
                      })}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete Video"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
                ))}
              </React.Fragment>
            ))
          )}
          
          {/* Archived Section */}
          {hasArchivedVideos && (
            <>
              <tr 
                className="bg-gray-500/20 border-l-4 border-gray-500 cursor-pointer hover:bg-gray-500/30 transition-colors"
                onClick={() => setShowArchived(!showArchived)}
              >
                <td colSpan={artistId ? 6 : 7} className="px-6 py-2">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                    {showArchived ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>Archived ({archivedVideos.length})</span>
                  </div>
                </td>
              </tr>
              
              {/* Archived Videos */}
              {showArchived && archivedVideos.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white w-3/5 truncate">
                      {submission.projectName}
                    </div>
                  </td>
                  {!artistId && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {getArtistName(submission.artistId)}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300 capitalize">
                      {submission.type.replace('-', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(submission.status)}`}>
                        {submission.status.replace(/-/g, ' ')}
                      </span>
                      {submission.status === 'ready' && submission.type === 'song-specific' && (
                        isVideoInAdCreatives(submission.videoUrl) ? (
                          <div
                            className="text-green-500 dark:text-green-400"
                            title="Already in Ad Creatives"
                          >
                            <AdTagIcon />
                          </div>
                        ) : movingVideos.has(submission.id.toString()) ? (
                          <div
                            className="text-blue-500 dark:text-blue-400"
                            title="Moving to Ad Creatives..."
                          >
                            <Loader className="h-4 w-4 animate-spin" />
                          </div>
                        ) : !isArtistView && (
                          <button
                            onClick={() => onMoveToAdCreatives(submission)}
                            className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            title="Move to Ad Creatives"
                          >
                            <MoveRight className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">
                      {formatDateToDDMMYY(submission.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {formatDateToDDMMYY(submission.updatedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedVideo(submission)}
                        className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        title="Give Feedback"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(submission.videoUrl)}
                        disabled={downloadingVideos.has(submission.videoUrl)}
                        className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        title="Download Video"
                      >
                        {downloadingVideos.has(submission.videoUrl) ? (
                          <Loader className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingVideo(submission)}
                        className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                        title="Edit Video"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleArchive(submission)}
                        className={`transition-colors ${
                          submission.status === 'archived'
                            ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300'
                            : 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
                        }`}
                        title={submission.status === 'archived' ? 'Unarchive Video' : 'Archive Video'}
                      >
                        <Archive className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation({
                          isOpen: true,
                          videoId: submission.id.toString(),
                          videoName: submission.projectName,
                        })}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete Video"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      </div>
    </div>

      {selectedVideo && (
        <FeedbackModal
          submission={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onUpdate={async () => {
            // Refresh the list with current filters, skip cache to get fresh data
            await fetchSubmissions(
              submissionsPagination.currentPage,
              submissionsPagination.pageSize,
              filters,
              true // skipCache - force fresh data
            );
          }}
        />
      )}

      {editingVideo && (
        <EditVideoModal
          submission={editingVideo}
          onClose={() => setEditingVideo(null)}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Video"
        message={`Are you sure you want to delete "${deleteConfirmation.videoName}"? This action cannot be undone and will remove all associated feedback.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, videoId: null, videoName: '' })}
      />
    </>
  );
};