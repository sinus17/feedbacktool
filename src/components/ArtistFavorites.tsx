import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { VideoDetailModal } from './library/VideoDetailModal';
import type { LibraryVideo } from '../types';

interface ArtistFavoritesProps {
  artistId: string;
}

interface LikedVideo {
  id: string;
  video_id: string;
  video_library: {
    id: string;
    title: string;
    thumbnail_storage_url: string | null;
    video_url: string;
    account_username?: string | null;
    account_name?: string | null;
    creator_username?: string | null;
    creator_name?: string | null;
    views_count?: number | null;
    likes_count?: number | null;
    comments_count?: number | null;
    shares_count?: number | null;
    view_count?: number | null;
    like_count?: number | null;
    comment_count?: number | null;
    share_count?: number | null;
  };
}

export const ArtistFavorites = ({ artistId }: ArtistFavoritesProps) => {
  const [likedVideos, setLikedVideos] = useState<LikedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<LibraryVideo | null>(null);

  useEffect(() => {
    console.log('⭐ ArtistFavorites useEffect triggered, artistId:', artistId);
    fetchLikedVideos();
  }, [artistId]);

  const fetchLikedVideos = async () => {
    console.log('⭐ fetchLikedVideos called with artistId:', artistId, 'type:', typeof artistId);
    try {
      // For template artist, fetch latest 5 videos from library directly
      if (artistId === 'template') {
        const { data, error } = await supabase
          .from('video_library')
          .select(`
            id,
            title,
            thumbnail_storage_url,
            video_url,
            account_username,
            account_name,
            views_count,
            likes_count,
            comments_count,
            shares_count
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        // Transform to match LikedVideo structure
        const transformedData = data?.map((video: any) => ({
          id: video.id,
          video_id: video.id,
          video_library: video,
        })) || [];

        setLikedVideos(transformedData as any);
        console.log('⭐ Fetched template videos:', { count: transformedData.length });
      } else {
        // For regular artists, fetch their liked videos
        const { data, error } = await (supabase as any)
          .from('artist_liked_library_videos')
          .select(`
            id,
            video_id,
            video_library (
              *
            )
          `)
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false })
          .limit(5);

        console.log('⭐ Fetched liked videos:', { data, error, count: data?.length, artistId });
        console.log('⭐ First video data:', data?.[0]);
        console.log('⭐ Error details:', error);
        
        if (error) {
          console.error('⭐ Error fetching liked videos:', error);
          throw error;
        }
        setLikedVideos((data || []) as any);
        console.log('⭐ Set liked videos state:', data?.length);
        console.log('⭐ Liked videos array:', data);
      }
    } catch (error) {
      console.error('Error fetching liked videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLibrary = () => {
    const url = `/library?tab=feed&public=true&artist=${artistId}`;
    console.log('🔗 Opening library with URL:', url);
    console.log('🔗 Artist ID:', artistId);
    window.open(url, '_blank');
  };

  console.log('⭐ Rendering ArtistFavorites:', { loading, likedVideosCount: likedVideos.length, artistId });

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse flex space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-40 w-60"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 min-h-[200px] bg-black rounded-lg p-4 outline-none" tabIndex={-1}>
      {/* Header with library link */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-400">
            <a
              href={`/library?tab=feed&public=true&artist=${artistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: '#0000fe' }}
            >
              {typeof window !== 'undefined' ? window.location.origin : ''}/library?tab=feed&public=true&artist={artistId}
            </a>
          </p>
          <button
            onClick={openLibrary}
            className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
            style={{ backgroundColor: '#0000fe' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0000cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0000fe'}
          >
            Open Library
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      {likedVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {likedVideos.map((liked) => (
            <div
              key={liked.id}
              className="group relative cursor-pointer"
              onClick={() => {
                // Add videoUrl in camelCase for VideoDetailModal compatibility
                const videoWithUrl = {
                  ...liked.video_library,
                  videoUrl: liked.video_library.video_url,
                };
                setSelectedVideo(videoWithUrl as any);
              }}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                {liked.video_library.thumbnail_storage_url ? (
                  <img
                    src={liked.video_library.thumbnail_storage_url}
                    alt={liked.video_library.title || 'Video thumbnail'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-8 w-8 text-gray-600">
                      <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/>
                    </svg>
                  </div>
                )}

                {/* Play button overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                  <div className="bg-primary-500 rounded-full p-4 transform transition-transform duration-300 group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white" className="h-8 w-8">
                      <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/>
                    </svg>
                  </div>
                </div>

                {/* Stats overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 text-xs text-white">
                    {((liked.video_library.views_count || liked.video_library.view_count) && (liked.video_library.views_count || liked.video_library.view_count)! > 0) && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3 w-3">
                          <path d="M320 128C189.7 128 81.1 213.9 38.1 336C81.1 458.1 189.7 544 320 544C450.3 544 558.9 458.1 601.9 336C558.9 213.9 450.3 128 320 128zM320 464C258.1 464 208 413.9 208 352C208 290.1 258.1 240 320 240C381.9 240 432 290.1 432 352C432 413.9 381.9 464 320 464zM320 288C284.7 288 256 316.7 256 352C256 387.3 284.7 416 320 416C355.3 416 384 387.3 384 352C384 316.7 355.3 288 320 288z"/>
                        </svg>
                        <span>{((liked.video_library.views_count || liked.video_library.view_count)! / 1000).toFixed(1)}K</span>
                      </div>
                    )}
                    {(liked.video_library.likes_count || liked.video_library.like_count) && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3 w-3">
                          <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/>
                        </svg>
                        <span>{((liked.video_library.likes_count || liked.video_library.like_count)! / 1000).toFixed(1)}K</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator info */}
              <div className="mt-2">
                {(liked.video_library.account_name || liked.video_library.account_username || liked.video_library.creator_name || liked.video_library.creator_username) && (
                  <p className="text-sm font-semibold text-white truncate">
                    @{liked.video_library.account_username || liked.video_library.creator_username || liked.video_library.account_name || liked.video_library.creator_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Detail Modal - Rendered via Portal */}
      {selectedVideo && createPortal(
        <VideoDetailModal
          video={selectedVideo}
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          onUpdate={() => {
            // Refresh the videos list
            fetchLikedVideos();
          }}
          canEdit={false}
        />,
        document.body
      )}
    </div>
  );
};

export default ArtistFavorites;
