import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Loader } from 'lucide-react';
import type { LibraryVideo } from '../../types';

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-8 w-8">
    <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z"/>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/>
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M576 304C576 436.5 461.4 544 320 544C282.9 544 247.7 536.6 215.9 523.3L97.5 574.1C88.1 578.1 77.3 575.8 70.4 568.3C63.5 560.8 62 549.8 66.8 540.8L115.6 448.6C83.2 408.3 64 358.3 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304z"/>
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M371.8 82.4C359.8 87.4 352 99 352 112L352 192L240 192C142.8 192 64 270.8 64 368C64 481.3 145.5 531.9 164.2 542.1C166.7 543.5 169.5 544 172.3 544C183.2 544 192 535.1 192 524.3C192 516.8 187.7 509.9 182.2 504.8C172.8 496 160 478.4 160 448.1C160 395.1 203 352.1 256 352.1L352 352.1L352 432.1C352 445 359.8 456.7 371.8 461.7C383.8 466.7 397.5 463.9 406.7 454.8L566.7 294.8C579.2 282.3 579.2 262 566.7 249.5L406.7 89.5C397.5 80.3 383.8 77.6 371.8 82.6z"/>
  </svg>
);

const BookmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-3.5 w-3.5">
    <path d="M320 128C189.7 128 81.1 213.9 38.1 336C81.1 458.1 189.7 544 320 544C450.3 544 558.9 458.1 601.9 336C558.9 213.9 450.3 128 320 128zM320 464C258.1 464 208 413.9 208 352C208 290.1 258.1 240 320 240C381.9 240 432 290.1 432 352C432 413.9 381.9 464 320 464zM320 288C284.7 288 256 316.7 256 352C256 387.3 284.7 416 320 416C355.3 416 384 387.3 384 352C384 316.7 355.3 288 320 288z"/>
  </svg>
);

interface VideoCardProps {
  video: LibraryVideo;
  onClick: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Stop observing once visible
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isProcessing = video.processingStatus === 'processing';

  return (
    <div
      ref={cardRef}
      className="group relative cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-[9/16] bg-dark-700 rounded-lg overflow-hidden">
        {/* Thumbnail - Only load when visible */}
        {isVisible && (video.thumbnailStorageUrl || video.thumbnailUrl) && !imageError ? (
          <img
            src={video.thumbnailStorageUrl || video.thumbnailUrl}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-dark-800">
            <div className="text-gray-600">
              <PlayIcon />
            </div>
          </div>
        )}

        {/* Adaptable Badge - Top Left */}
        {(video as any).is_adaptable && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-md border border-yellow-500/40">
            ⚡
          </span>
        )}

        {/* Play button overlay on hover (or Processing indicator) */}
        {isProcessing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <Loader className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-white font-medium">Processing...</p>
            </div>
          </div>
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="bg-primary-500 rounded-full p-4 transform transition-transform duration-300 group-hover:scale-110">
              <PlayIcon />
            </div>
          </div>
        )}

        {/* Stats - always visible */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <div className="flex items-center gap-3 text-xs text-white">
            {(video.viewsCount !== undefined && video.viewsCount !== null && video.viewsCount > 0) && (
              <div className="flex items-center gap-1">
                <EyeIcon />
                <span className="font-medium">{formatNumber(video.viewsCount)}</span>
              </div>
            )}
            {video.likesCount && (
              <div className="flex items-center gap-1">
                <HeartIcon />
                <span className="font-medium">{formatNumber(video.likesCount)}</span>
              </div>
            )}
            {video.commentsCount && (
              <div className="flex items-center gap-1">
                <CommentIcon />
                <span className="font-medium">{formatNumber(video.commentsCount)}</span>
              </div>
            )}
            {video.sharesCount && (
              <div className="flex items-center gap-1">
                <ShareIcon />
                <span className="font-medium">{formatNumber(video.sharesCount)}</span>
              </div>
            )}
            {video.collectCount && (
              <div className="flex items-center gap-1">
                <BookmarkIcon />
                <span className="font-medium">{formatNumber(video.collectCount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Featured badge */}
        {video.featured && (
          <div className="absolute top-2 left-2 bg-primary-500 px-2 py-1 rounded text-xs text-white font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Featured
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-2 space-y-2">
        {video.accountUsername && (
          <div className="flex items-center gap-2">
            {/* Profile Picture - Only use storage URL to prevent external CDN requests */}
            {video.creatorAvatarStorageUrl ? (
              <img
                src={video.creatorAvatarStorageUrl}
                alt={video.accountName || video.accountUsername}
                className="h-8 w-8 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-dark-700 flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
            
            {/* Username with Platform Icon - Clickable */}
            <a
              href={video.platform === 'tiktok' 
                ? `https://www.tiktok.com/@${video.accountUsername}`
                : `https://www.instagram.com/${video.accountUsername}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-primary-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Platform Icon */}
              <div className="text-white">
                {video.platform === 'tiktok' ? (
                  <TikTokIcon />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                )}
              </div>
              <p className="text-sm font-semibold text-white truncate">
                @{video.accountUsername}
              </p>
            </a>
          </div>
        )}
        
        {/* Stats below thumbnail */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {(video.viewsCount !== undefined && video.viewsCount !== null && video.viewsCount > 0) && (
            <div className="flex items-center gap-1">
              <EyeIcon />
              <span>{formatNumber(video.viewsCount)}</span>
            </div>
          )}
          {video.likesCount && (
            <div className="flex items-center gap-1">
              <HeartIcon />
              <span>{formatNumber(video.likesCount)}</span>
            </div>
          )}
          {video.commentsCount && (
            <div className="flex items-center gap-1">
              <CommentIcon />
              <span>{formatNumber(video.commentsCount)}</span>
            </div>
          )}
          {video.sharesCount && (
            <div className="flex items-center gap-1">
              <ShareIcon />
              <span>{formatNumber(video.sharesCount)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
