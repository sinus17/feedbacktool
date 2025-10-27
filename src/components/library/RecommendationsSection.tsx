import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { VideoDetailModal } from './VideoDetailModal';
import type { LibraryVideo } from '../../types';

interface TikTokTrendingPost {
  id: string;
  desc: string;
  createTime: number;
  author: {
    id: string;
    uniqueId: string;
    nickname: string;
    avatarThumb: string;
    avatarMedium: string;
    avatarLarger: string;
    signature: string;
    verified: boolean;
  };
  authorStats: {
    followerCount: number;
    followingCount: number;
    heart: number;
    heartCount: number;
    videoCount: number;
    diggCount: number;
  };
  music: {
    id: string;
    title: string;
    playUrl: string;
    coverThumb: string;
    coverMedium: string;
    coverLarge: string;
    authorName: string;
    original: boolean;
    duration: number;
  };
  challenges: Array<{
    id: string;
    title: string;
    desc: string;
  }>;
  stats: {
    diggCount: number;
    shareCount: number;
    commentCount: number;
    playCount: number;
    collectCount: number;
  };
  video: {
    id: string;
    height: number;
    width: number;
    duration: number;
    ratio: string;
    cover: string;
    originCover: string;
    dynamicCover: string;
    playAddr: string;
    downloadAddr: string;
    format: string;
  };
}


export const RecommendationsSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<TikTokTrendingPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<TikTokTrendingPost | null>(null);

  useEffect(() => {
    if (isExpanded && recommendations.length === 0) {
      fetchRecommendations();
    }
  }, [isExpanded]);

  const fetchRecommendations = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // If force refresh, fetch new trending posts from TikTok first
      if (forceRefresh) {
        console.log('🔄 Fetching NEW trending posts from TikTok...');
        const { data: { session } } = await supabase.auth.getSession();
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tiktok-trending?count=16`;
        
        await fetch(edgeFunctionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        // Wait a bit for the database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Fetch existing recommendations from the database
      console.log('🔍 Fetching recommendations from database...');
      const { data: dbRecommendations, error: dbError } = await supabase
        .from('video_library_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dbError) {
        throw dbError;
      }

      // Filter and convert database records to TikTokTrendingPost format
      const posts: TikTokTrendingPost[] = dbRecommendations
        ?.filter((rec: any) => rec.recommendation_source === 'tiktok_trending_api')
        .map((rec: any) => {
          console.log(`📹 Video ${rec.video_id}:`, {
            video_url: rec.video_url,
            is_photo_post: rec.is_photo_post,
            image_urls: rec.image_urls,
            music_adaptation_score: rec.music_adaptation_score
          });
          return {
            id: rec.video_id,
            desc: rec.title,
            createTime: new Date(rec.created_at).getTime() / 1000,
            author: {
              id: rec.video_id,
              uniqueId: rec.account_username || '',
              nickname: rec.account_name || '',
              avatarThumb: rec.creator_avatar_storage_url || rec.creator_avatar_url || '',
              avatarMedium: rec.creator_avatar_storage_url || rec.creator_avatar_url || '',
              avatarLarger: rec.creator_avatar_storage_url || rec.creator_avatar_url || '',
              signature: '',
              verified: false,
            },
            authorStats: {
              followerCount: rec.follower_count || 0,
              followingCount: 0,
              heart: 0,
              heartCount: 0,
              videoCount: 0,
              diggCount: 0,
            },
            music: {
              id: '',
              title: rec.music_title || '',
              playUrl: '',
              coverThumb: '',
              coverMedium: '',
              coverLarge: '',
              authorName: rec.music_author || '',
              original: rec.is_original_sound || false,
              duration: 0,
            },
            challenges: [],
            stats: {
              diggCount: rec.likes_count || 0,
              shareCount: rec.shares_count || 0,
              commentCount: rec.comments_count || 0,
              playCount: rec.views_count || 0,
              collectCount: rec.collect_count || 0,
            },
            video: {
              id: rec.video_id,
              height: 0,
              width: 0,
              duration: rec.duration || 0,
              ratio: '',
              cover: rec.thumbnail_storage_url || rec.thumbnail_url || '',
              originCover: rec.thumbnail_storage_url || rec.thumbnail_url || '',
              dynamicCover: rec.thumbnail_storage_url || rec.thumbnail_url || '',
              playAddr: rec.video_url || '', // This is the downloaded storage URL!
              downloadAddr: rec.video_url || '',
              format: 'mp4',
            },
            // Store the processing status, photo post data, and adaptation score
            _processingStatus: rec.processing_status,
            _videoStorageUrl: rec.video_url,
            _isPhotoPost: rec.is_photo_post || false,
            _imageUrls: rec.image_urls || [],
            _musicAdaptationScore: rec.music_adaptation_score,
          };
        })
        .sort((a, b) => {
          // Sort by music adaptation score (descending), then by creation time
          const scoreA = (a as any)._musicAdaptationScore ?? -1;
          const scoreB = (b as any)._musicAdaptationScore ?? -1;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return b.createTime - a.createTime;
        }) || [];

      console.log('📊 Total posts loaded:', posts.length);
      setRecommendations(posts);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };


  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Convert TikTokTrendingPost to LibraryVideo format for the modal
  const convertPostToLibraryVideo = (post: TikTokTrendingPost): LibraryVideo => {
    const originalVideoId = post.video.id || post.id;
    const isPhotoPost = (post as any)._isPhotoPost || false;
    const imageUrls = (post as any)._imageUrls || [];
    
    console.log(`🎬 Converting post ${post.id}:`, {
      isPhotoPost,
      imageUrlsCount: imageUrls.length,
      imageUrls
    });

    return {
      id: post.id,
      platform: 'tiktok' as const,
      sourceUrl: `https://www.tiktok.com/@${post.author.uniqueId}/video/${post.id}`,
      videoId: originalVideoId,
      accountUsername: post.author.uniqueId,
      accountName: post.author.nickname,
      followerCount: post.authorStats.followerCount,
      title: post.desc,
      description: post.desc,
      duration: post.video.duration,
      viewsCount: post.stats.playCount,
      likesCount: post.stats.diggCount,
      commentsCount: post.stats.commentCount,
      sharesCount: post.stats.shareCount,
      collectCount: post.stats.collectCount,
      videoUrl: post.video.playAddr || '', // Use the downloaded storage URL from database
      thumbnailUrl: post.video.cover,
      creatorAvatarUrl: post.author.avatarThumb,
      musicTitle: post.music.title,
      musicAuthor: post.music.authorName,
      isOriginalSound: post.music.original,
      isPhotoPost,
      imageUrls,
      processingStatus: 'completed' as const,
      isPublished: false,
      featured: false,
      createdAt: new Date(post.createTime * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      isTrending: true, // Flag to identify trending videos
    } as any;
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await fetchRecommendations(true);
    setIsRefreshing(false);
  };

  return (
    <div className="border-t" style={{ borderColor: '#222222' }}>
      <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-dark-800 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1"
        >
          <h2 className="text-xl font-semibold text-white">
            Trending Posts
          </h2>
          {recommendations.length > 0 && (
            <span className="text-sm text-gray-400">
              {recommendations.length} posts
            </span>
          )}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
            title="Fetch new trending posts"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => fetchRecommendations()}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No recommendations available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
              {recommendations.map((post) => (
                <div key={post.id} className="group relative">
                  <div 
                    className="relative aspect-[9/16] bg-dark-700 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setSelectedPost(post)}
                  >
                    <img
                      src={post.video.cover}
                      alt={post.desc}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    
                    {/* Overlay with stats */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                      <div className="flex items-center gap-3 text-xs text-white">
                        {/* Views */}
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M320 128C189.7 128 81.1 213.9 38.1 336C81.1 458.1 189.7 544 320 544C450.3 544 558.9 458.1 601.9 336C558.9 213.9 450.3 128 320 128zM320 464C258.1 464 208 413.9 208 352C208 290.1 258.1 240 320 240C381.9 240 432 290.1 432 352C432 413.9 381.9 464 320 464zM320 288C284.7 288 256 316.7 256 352C256 387.3 284.7 416 320 416C355.3 416 384 387.3 384 352C384 316.7 355.3 288 320 288z"></path>
                          </svg>
                          <span className="font-medium">{formatNumber(post.stats.playCount)}</span>
                        </div>
                        {/* Likes */}
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"></path>
                          </svg>
                          <span className="font-medium">{formatNumber(post.stats.diggCount)}</span>
                        </div>
                        {/* Comments */}
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M576 304C576 436.5 461.4 544 320 544C282.9 544 247.7 536.6 215.9 523.3L97.5 574.1C88.1 578.1 77.3 575.8 70.4 568.3C63.5 560.8 62 549.8 66.8 540.8L115.6 448.6C83.2 408.3 64 358.3 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304z"></path>
                          </svg>
                          <span className="font-medium">{formatNumber(post.stats.commentCount)}</span>
                        </div>
                        {/* Shares */}
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M371.8 82.4C359.8 87.4 352 99 352 112L352 192L240 192C142.8 192 64 270.8 64 368C64 481.3 145.5 531.9 164.2 542.1C166.7 543.5 169.5 544 172.3 544C183.2 544 192 535.1 192 524.3C192 516.8 187.7 509.9 182.2 504.8C172.8 496 160 478.4 160 448.1C160 395.1 203 352.1 256 352.1L352 352.1L352 432.1C352 445 359.8 456.7 371.8 461.7C383.8 466.7 397.5 463.9 406.7 454.8L566.7 294.8C579.2 282.3 579.2 262 566.7 249.5L406.7 89.5C397.5 80.3 383.8 77.6 371.8 82.6z"></path>
                          </svg>
                          <span className="font-medium">{formatNumber(post.stats.shareCount)}</span>
                        </div>
                        {/* Saves/Collects */}
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"></path>
                          </svg>
                          <span className="font-medium">{formatNumber(post.stats.collectCount)}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Video Info */}
                  <div className="mt-2 space-y-1">
                    {(post as any)._musicAdaptationScore !== undefined ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-400">Adaptation Score</span>
                          <span className="text-sm font-bold text-white">
                            {(post as any)._musicAdaptationScore}/10
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                            style={{
                              width: `${((post as any)._musicAdaptationScore / 10) * 100}%`,
                              background: `linear-gradient(to right, #0000fe, #3b81f6)`
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white font-medium line-clamp-2">
                        {post.desc}
                      </p>
                    )}
                    
                    {/* Creator Info */}
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={post.author.avatarThumb}
                        alt={post.author.nickname}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <a
                        href={`https://www.tiktok.com/@${post.author.uniqueId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary-400 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-white">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"></path>
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">
                          @{post.author.uniqueId}
                        </p>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {isExpanded && recommendations.length > 0 && (
        <div className="border-t" style={{ borderColor: '#222222' }} />
      )}

      {/* Video Detail Modal */}
      {selectedPost && (
        <VideoDetailModal
          video={convertPostToLibraryVideo(selectedPost)}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          canEdit={true}
          onUpdate={() => {
            // Refresh recommendations list after moving to library
            fetchRecommendations(false);
          }}
        />
      )}
    </div>
  );
};
