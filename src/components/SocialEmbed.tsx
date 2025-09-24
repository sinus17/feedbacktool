import React, { useState, useEffect } from 'react';
import { ExternalLink, Eye, EyeOff, X } from 'lucide-react';

interface SocialEmbedProps {
  url: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  onDelete?: () => void;
}

export const SocialEmbed: React.FC<SocialEmbedProps> = ({ url, platform, onDelete }) => {
  const [showPreview, setShowPreview] = useState(true);
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    const generateEmbedUrl = () => {
      let embed = '';
      
      switch (platform) {
        case 'instagram':
          // Convert Instagram URL to embed format
          const instagramMatch = url.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
          if (instagramMatch) {
            embed = `https://www.instagram.com/p/${instagramMatch[2]}/embed/`;
          }
          break;
          
        case 'tiktok':
          // Convert TikTok URL to embed format
          const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
          if (tiktokMatch) {
            embed = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
          }
          break;
          
        case 'youtube':
          // Convert YouTube URL to embed format
          let videoId = '';
          const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
          if (youtubeMatch) {
            videoId = youtubeMatch[1];
            embed = `https://www.youtube.com/embed/${videoId}`;
          }
          break;
      }
      
      setEmbedUrl(embed);
    };

    generateEmbedUrl();
  }, [url, platform]);

  const getPlatformName = () => {
    switch (platform) {
      case 'instagram':
        return isInstagramReel() ? 'Instagram Reel' : 'Instagram Post';
      case 'tiktok':
        return 'TikTok Video';
      case 'youtube':
        return 'YouTube Video';
      default:
        return 'Social Media';
    }
  };


  const isInstagramReel = () => {
    return platform === 'instagram' && url.includes('/reel/');
  };


  return (
    <div className="my-4 flex justify-center">
      {showPreview ? (
        // Native embed with eye icon overlay
        <div className="relative inline-block group">
          {embedUrl ? (
            <>
              <iframe
                src={embedUrl}
                className="rounded-lg border-0"
                width={platform === 'instagram' || platform === 'tiktok' ? '325' : '560'}
                height={platform === 'instagram' ? '400' : platform === 'tiktok' ? '600' : '315'}
                frameBorder="0"
                scrolling={platform === 'instagram' ? 'no' : platform === 'tiktok' ? 'no' : 'yes'}
                allowTransparency={platform === 'instagram'}
                allow={platform !== 'instagram' ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' : undefined}
                allowFullScreen={platform !== 'instagram'}
                loading="lazy"
              />
              {/* Eye icon in top-right corner - only visible on hover */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-all opacity-0 group-hover:opacity-100"
                title="Hide Preview"
              >
                <EyeOff className="h-3 w-3 text-white" />
              </button>
              {/* Delete button - only visible on hover */}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="absolute top-2 right-10 p-1 bg-red-500/80 hover:bg-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  title="Remove Embed"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">❌</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Unable to load preview
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                View Original
              </a>
            </div>
          )}
        </div>
      ) : (
        // Plain link when preview is hidden
        <div className="flex items-center space-x-2 text-blue-500 hover:underline">
          <button
            onClick={() => setShowPreview(true)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Show Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{getPlatformName()}</span>
          </a>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-500"
              title="Remove Embed"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
