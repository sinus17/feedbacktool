import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader, Grid3x3, Play } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { cache } from '../lib/cache';
import { AddVideoModal } from '../components/library/AddVideoModal';
import { VideoCard } from '../components/library/VideoCard';
import { VideoDetailModal } from '../components/library/VideoDetailModal';
import { FeedView } from '../components/library/FeedView';
import type { LibraryVideo } from '../types';

const CACHE_KEY = 'library_videos_v4'; // Updated for photo post support
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const Library: React.FC = () => {
  console.log('📚 Library component mounted');
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<LibraryVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<LibraryVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userTeam, setUserTeam] = useState<string>('');
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(new Set());
  
  const activeTab = searchParams.get('tab') || 'grid';
  const isPublicMode = searchParams.get('public') === 'true';

  useEffect(() => {
    console.log('🔄 Library useEffect triggered - starting data load');
    loadVideos();
    loadUserProfile();

    // Subscribe to realtime updates for new videos
    const channel = supabase
      .channel('video_library_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_library',
          filter: 'processing_status=eq.completed'
        },
        (payload) => {
          console.log('🔔 Realtime update received:', payload);
          // Reload videos when a new video is completed
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('📹 New/updated video detected, reloading...');
            loadVideos(true); // Force refresh
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from realtime updates');
      supabase.removeChannel(channel);
    };
  }, []);
  
  useEffect(() => {
    // Poll for processing videos every 5 seconds
    if (processingVideos.size === 0) return;
    
    const interval = setInterval(() => {
      checkProcessingStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [processingVideos.size]);

  useEffect(() => {
    filterVideos();
  }, [videos, searchQuery, selectedGenre, selectedType, selectedCategory]);

  const loadUserProfile = async () => {
    console.log('👤 Loading user profile...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User:', user?.id);
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('team')
        .eq('id' as any, user.id as any)
        .single();

      if (profile) {
        setUserTeam((profile as any).team);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkProcessingStatus = async () => {
    try {
      const { data: queue } = await supabase
        .from('video_library_queue')
        .select('id, status, video_library_id')
        .in('id' as any, Array.from(processingVideos) as any)
        .in('status' as any, ['queued', 'processing'] as any);
      
      if (queue && queue.length === 0) {
        // All videos are done processing
        setProcessingVideos(new Set());
        loadVideos(); // Reload to show new videos
      } else if (queue) {
        // Update the set with only still-processing videos
        const stillProcessing = new Set(queue.map((q: any) => q.id));
        setProcessingVideos(stillProcessing);
        
        // Check if any completed
        const completed = Array.from(processingVideos).filter(id => !stillProcessing.has(id));
        if (completed.length > 0) {
          loadVideos(); // Reload to show newly completed videos
        }
      }
    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  };
  
  const loadVideos = async (forceRefresh = false) => {
    console.log('📹 Loading videos...');
    setIsLoading(true);
    
    // Check cache first
    if (!forceRefresh) {
      const cachedVideos = cache.get<LibraryVideo[]>(CACHE_KEY);
      if (cachedVideos) {
        setVideos(cachedVideos);
        setIsLoading(false);
        return;
      }
    }
    
    try {
      console.log('🔍 About to query video_library table...');
      console.log('🔌 Supabase client:', !!supabase);
      
      // Use direct fetch to bypass problematic Supabase client wrapper
      const directUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/video_library?select=*,gemini_analysis_en&processing_status=in.(processing,completed)&is_published=eq.true&order=created_at.desc`;
      const directHeaders = {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };
      
      const directResponse = await fetch(directUrl, { headers: directHeaders });
      const directData = await directResponse.json();
      
      const { data, error } = { data: directData, error: null };

      console.log('✅ Video query completed!');
      console.log('📦 Video query result:', { hasData: !!data, error, dataLength: data?.length });

      if (error) throw error;

      const mappedVideos = data?.map((v: any) => ({
        id: v.id,
        platform: v.platform,
        sourceUrl: v.source_url,
        videoId: v.video_id,
        accountUsername: v.account_username,
        accountName: v.account_name,
        followerCount: v.follower_count,
        description: v.description,
        uploadDate: v.upload_date,
        duration: v.duration,
        viewsCount: v.views_count,
        likesCount: v.likes_count,
        commentsCount: v.comments_count,
        sharesCount: v.shares_count,
        collectCount: v.collect_count,
        videoUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url,
        thumbnailStorageUrl: v.thumbnail_storage_url,
        creatorAvatarUrl: v.creator_avatar_url,
        creatorAvatarStorageUrl: v.creator_avatar_storage_url,
        isPhotoPost: v.is_photo_post,
        imageUrls: v.image_urls,
        genre: v.genre,
        category: v.category,
        tags: v.tags,
        type: v.type,
        actor: v.actor,
        contentDescription: v.content_description,
        whyItWorks: v.why_it_works,
        artistRecommendation: v.artist_recommendation,
        diversification_labels: v.diversification_labels,
        location_name: v.location_name,
        location_city: v.location_city,
        location_country: v.location_country,
        location_address: v.location_address,
        suggested_words: v.suggested_words,
        musicTitle: v.music_title,
        musicAuthor: v.music_author,
        isOriginalSound: v.is_original_sound,
        musicCoverThumb: v.music_cover_thumb,
        musicVideoCount: v.music_video_count,
        gemini_analysis: v.gemini_analysis,
        geminiAnalyzedAt: v.gemini_analyzed_at,
        processingStatus: v.processing_status,
        processingError: v.processing_error,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        createdBy: v.created_by,
        isPublished: v.is_published,
        featured: v.featured,
      }));

      console.log('🗺️  Mapped videos:', mappedVideos?.length);
      console.log('💾 Setting videos state...');
      setVideos(mappedVideos);
      
      // Update cache
      cache.set(CACHE_KEY, mappedVideos, CACHE_TTL);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      console.log('✨ Setting isLoading to false');
      setIsLoading(false);
    }
  };
  
  const handleVideoAdded = (queueId: string) => {
    setProcessingVideos(prev => new Set(prev).add(queueId));
    // Invalidate cache so next load fetches fresh data
    cache.invalidate(CACHE_KEY);
    
    // Force refresh after 7 seconds to ensure the video appears in the queue
    console.log('⏱️ Scheduling auto-refresh in 7 seconds...');
    setTimeout(() => {
      console.log('🔄 Auto-refreshing after video added...');
      loadVideos(true);
    }, 7000);
  };

  const filterVideos = () => {
    console.log('🔎 Filtering videos, total:', videos.length);
    let filtered = [...videos];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.title?.toLowerCase().includes(query) ||
          v.description?.toLowerCase().includes(query) ||
          v.accountUsername?.toLowerCase().includes(query) ||
          (typeof v.genre === 'string' && v.genre.toLowerCase().includes(query)) ||
          (typeof v.category === 'string' && v.category.toLowerCase().includes(query)) ||
          v.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter((v) => v.genre === selectedGenre);
    }

    // Type filter (song-specific / off-topic)
    if (selectedType !== 'all') {
      filtered = filtered.filter((v) => v.type === selectedType);
    }

    // Category filter (Performance, Relatable, Entertainment, Personal)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((v) => {
        if (Array.isArray(v.category)) {
          return v.category.includes(selectedCategory);
        }
        return v.category === selectedCategory;
      });
    }

    console.log('✅ Filtered videos:', filtered.length);
    console.log('💾 Setting filteredVideos state...');
    setFilteredVideos(filtered);
  };

  const genres = Array.from(new Set(videos.flatMap((v) => v.genre || []).filter(Boolean)));
  const canEdit = userTeam === 'admin' || userTeam === 'management';

  // If feed mode, show FeedView
  if (activeTab === 'feed') {
    return <FeedView videos={filteredVideos} isPublicMode={isPublicMode} />;
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#111111' }}>
      {/* Hero Section - Hidden in public mode */}
      {!isPublicMode && (
        <div className="relative border-b" style={{ borderColor: '#222222' }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Video Library</h1>
                <p className="text-gray-400">
                  Curated collection of inspiring social media videos
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add Video
                </button>
              )}
            </div>

            {/* Filters */}
          <div className="flex flex-col gap-4">
            {/* Search - Full Width */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos, accounts, genres..."
                className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filters Grid - 2 columns on mobile, flex row on desktop */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4">
              {/* Genre Filter */}
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Genres</option>
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>

              {/* Type Filter (song-specific / off-topic) */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="song-specific">Song-Specific</option>
                <option value="off-topic">Off-Topic</option>
              </select>

              {/* Category Filter (Performance, Relatable, etc.) */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Categories</option>
                <option value="Performance">Performance</option>
                <option value="Relatable">Relatable</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Personal">Personal</option>
              </select>

              {/* View Mode Toggle - Fits perfectly next to Category on mobile */}
              <div className="flex gap-2 w-full">
                <button
                onClick={() => setSearchParams({ tab: 'grid' })}
                className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center ${
                  activeTab === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSearchParams({ tab: 'feed' })}
                className={`flex-1 p-2 rounded-lg transition-colors flex items-center justify-center ${
                  activeTab === 'feed'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                }`}
                title="Feed View (TikTok Style)"
              >
                <Play className="h-5 w-5" />
              </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-400">
            {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
          </div>
        </div>
      </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="h-12 w-12 text-primary-500 animate-spin" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No videos found</p>
            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Your First Video
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddVideoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVideoAdded={(queueId) => {
          handleVideoAdded(queueId);
          loadVideos();
        }}
      />

      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onUpdate={loadVideos}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};
