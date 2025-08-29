import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { useContentPlanStore } from '../store/contentPlanStore';
import { useStore } from '../store';
import { Loader, AlertCircle, Filter, Plus, ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react';
import { ContentPlanPostModal } from './ContentPlanPostModal';
import { ContentPlanFilterMenu } from './ContentPlanFilterMenu';
import { motion, AnimatePresence } from 'framer-motion';

// Create DnD Calendar
const DragAndDropCalendar = withDragAndDrop(Calendar);

// Setup the localizer
const localizer = momentLocalizer(moment);

interface ContentPlanCalendarProps {
  artistId?: string;
}

export const ContentPlanCalendar: React.FC<ContentPlanCalendarProps> = ({ artistId }) => {
  const { 
    posts, 
    loading, 
    error, 
    fetchPosts, 
    selectedDate,
    setSelectedDate,
    movePost
  } = useContentPlanStore();
  
  const { artists } = useStore();
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedPost, setDraggedPost] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'month' | 'agenda'>('month');
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    fetchPosts(artistId);
  }, [fetchPosts, artistId]);
  
  const handleSelectSlot = ({ start, action }: { start: Date; action: string }) => {
    // Only show add modal when clicking, not when dragging
    if (action === 'click' || action === 'select') {
      setSelectedDate(start);
      setSelectedPost(null);
      setShowPostModal(true);
    }
  };
  
  const handleSelectPost = (post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const handleEventDrop = async ({ event, start }: any) => {
    // Set dragged state for visual feedback
    setDraggedPost(event.id);
    
    // Move the post (this now updates UI optimistically)
    await movePost(event.id, start);
    
    // Clear dragged state
    setDraggedPost(null);
  };
  
  const eventStyleGetter = (post: any) => {
    let backgroundColor = post.color || '#3b82f6';
    
    const style: React.CSSProperties = {
      backgroundColor,
      borderRadius: '4px',
      opacity: draggedPost === post.id ? 0.7 : 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      position: 'relative',
      cursor: 'move',
      transform: draggedPost === post.id ? 'scale(1.02)' : 'none',
      transition: 'all 0.2s ease-in-out',
      boxShadow: draggedPost === post.id ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
    };
    
    if (post.type === 'song-specific') {
      style.borderLeft = '4px solid #10b981';
    } else {
      style.borderLeft = '4px solid #8b5cf6';
    }
    
    return { style };
  };
  
  // Custom toolbar component with arrow icons
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };
    
    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };
    
    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };
    
    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-lg font-medium dark:text-white">
          {date.format('MMMM YYYY')}
        </span>
      );
    };
    
    return (
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <motion.button
            type="button"
            onClick={goToBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
          <motion.button
            type="button"
            onClick={goToCurrent}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Today
          </motion.button>
          <motion.button
            type="button"
            onClick={goToNext}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
        </div>
        
        <div className="text-center">
          {label()}
        </div>
        
        <div className="flex space-x-2">
          <motion.button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentView === 'month'
                ? 'bg-primary-500 text-white'
                : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => {
              setCurrentView('month');
              toolbar.onView(Views.MONTH);
            }}
            whileTap={{ scale: 0.95 }}
          >
            Month
          </motion.button>
          <motion.button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentView === 'agenda'
                ? 'bg-primary-500 text-white'
                : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => {
              setCurrentView('agenda');
              toolbar.onView(Views.AGENDA);
            }}
            whileTap={{ scale: 0.95 }}
          >
            Agenda
          </motion.button>
        </div>
      </div>
    );
  };
  
  // Custom date cell component to highlight today
  const CustomDateCell = ({ value, children }: any) => {
    const today = new Date();
    const isToday = 
      value.getDate() === today.getDate() &&
      value.getMonth() === today.getMonth() &&
      value.getFullYear() === today.getFullYear();
    
    return (
      <div className={`h-full w-full flex items-center justify-center ${
        isToday ? 'bg-red-500/10 dark:bg-red-500/20 font-bold' : ''
      }`}>
        {children}
      </div>
    );
  };

  // Helper function to handle video download
  const handleDownload = (videoUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
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
      
      // For Dropbox URLs, modify to use dl=1 for direct download
      if (videoUrl.includes('dropbox.com')) {
        try {
          const urlObj = new URL(videoUrl);
          urlObj.searchParams.set('dl', '1');
          const downloadUrl = urlObj.toString();
          
          // Create a temporary link element for download
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Remove from downloading state after a short delay
          setTimeout(() => {
            setDownloadingVideos(prev => {
              const newSet = new Set(prev);
              newSet.delete(videoUrl);
              return newSet;
            });
          }, 1000);
        } catch (error) {
          console.error('Error processing Dropbox URL:', error);
          // Remove from downloading state
          setDownloadingVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoUrl);
            return newSet;
          });
          // Fallback to opening the original URL
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        // For non-Dropbox URLs (Supabase storage), use Edge Function
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
          
          // Fallback to direct URL
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
        });
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      // Remove from downloading state on error
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoUrl);
        return newSet;
      });
    }
  };

  // Custom agenda event component with content type and video name separated
  const CustomAgendaEvent = ({ event }: any) => {
    return (
      <div className="grid grid-cols-3 gap-4 w-full items-center">
        {/* Date Column */}
        <div className="font-mono text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {moment(event.start).format('DD-MM-YYYY')}
        </div>
        
        {/* Type Column */}
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            event.type === 'song-specific' 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' 
              : 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300'
          }`}>
            {event.type === 'song-specific' ? 'Song' : 'Off-Topic'}
          </span>
        </div>
        
        {/* Name Column */}
        <div className="font-medium text-gray-900 dark:text-white relative overflow-hidden min-w-0">
          <span className={`block ${
            event.title && event.title.length > 50 
              ? 'truncate-fade' 
              : ''
          }`}>
            {event.title}
          </span>
        </div>
      </div>
    );
  };

  // Custom agenda header to customize column headers
  const CustomAgendaHeader = ({ label }: { label: string }) => {
    return null; // We'll use our own table header
  };

  // Custom agenda date formatter to ensure uniform date format
  const formatAgendaDate = (date: Date, culture: string, localizer: any) => {
    return moment(date).format('DD-MM-YYYY'); // Uniform date format with hyphens
  };
  
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {error && (
          <motion.div 
            className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
            <motion.button
              onClick={() => fetchPosts(artistId)}
              className="ml-auto text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">
          {artistId ? `${artists.find(a => a.id === artistId)?.name}'s Content Plan` : 'Content Plan'}
        </h2>
        
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </motion.button>
          
          <motion.button
            onClick={() => {
              setSelectedPost(null);
              setShowPostModal(true);
            }}
            className="btn flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-4 w-4" />
            <span>Add Post</span>
          </motion.button>
        </div>
      </div>
      
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ContentPlanFilterMenu artistId={artistId} />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-[600px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {currentView === 'month' ? (
          <DragAndDropCalendar
            localizer={localizer}
            events={posts}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectPost}
            selectable
            resizable={false}
            onEventDrop={handleEventDrop}
            eventPropGetter={eventStyleGetter}
            views={['month']}
            view={currentView}
            onView={(view) => setCurrentView(view as 'month' | 'agenda')}
            defaultDate={new Date()}
            popup
            components={{
              event: ({ event }) => (
                <motion.div 
                  className="truncate text-sm cursor-move"
                  whileHover={{ scale: 1.02 }}
                  whileDrag={{ 
                    scale: 1.05,
                    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                    zIndex: 50
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.1}
                >
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      event.type === 'song-specific' 
                        ? 'bg-emerald-500' 
                        : 'bg-violet-500'
                    }`}></span>
                    {event.title}
                  </div>
                </motion.div>
              ),
              toolbar: CustomToolbar,
              dateCellWrapper: CustomDateCell
            }}
          />
        ) : (
          /* Custom agenda table matching video submissions style */
          <div className="h-full overflow-hidden">
            <div className="overflow-x-auto h-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {posts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No scheduled posts found
                      </td>
                    </tr>
                  ) : (
                    posts
                      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                      .map((post) => (
                        <tr 
                          key={post.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
                            onClick={() => handleSelectPost(post)}
                          >
                            {moment(post.start).format('DD.MM.YYYY')}
                          </td>
                          <td 
                            className="px-6 py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => handleSelectPost(post)}
                          >
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              post.type === 'song-specific'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                            }`}>
                              {post.type === 'song-specific' ? 'Song Specific' : 'Off Topic'}
                            </span>
                          </td>
                          <td 
                            className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
                            onClick={() => handleSelectPost(post)}
                          >
                            <div>
                              <div className="font-medium">{post.title}</div>
                              {post.notes && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                                  {post.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <motion.button
                              onClick={(e) => handleDownload(post.videoUrl || '', e)}
                             disabled={downloadingVideos.has(post.videoUrl || '')}
                              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                              title="Download Video"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              {downloadingVideos.has(post.videoUrl || '') ? (
                                <Loader className="h-5 w-5 animate-spin" />
                              ) : (
                                <Download className="h-5 w-5" />
                              )}
                            </motion.button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
      
      <AnimatePresence>
        {showPostModal && (
          <ContentPlanPostModal
            post={selectedPost}
            artistId={artistId}
            onClose={() => setShowPostModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};