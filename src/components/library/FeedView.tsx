import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LibraryVideo } from '../../types';

interface FeedViewProps {
  videos: LibraryVideo[];
}

export const FeedView: React.FC<FeedViewProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentVideo = videos[currentIndex];

  // Auto-play current video
  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(err => console.error('Autoplay failed:', err));
    } else if (videoRef.current && !isPlaying) {
      videoRef.current.pause();
    }
  }, [currentIndex, isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPrevious();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // Scroll navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        navigateToNext();
      } else if (e.deltaY < 0) {
        navigateToPrevious();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [currentIndex, videos.length]);

  const navigateToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnalysis(false);
    }
  };

  const navigateToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowAnalysis(false);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    setShowAnalysis(!showAnalysis);
  };

  if (!currentVideo) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p>No videos available</p>
      </div>
    );
  }

  // Parse Gemini analysis
  const analysis = (currentVideo as any).gemini_analysis || {};

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ height: '100vh', width: '100vw' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={currentVideo.videoUrl}
        className="absolute inset-0 w-full h-full object-contain"
        loop
        playsInline
        onClick={handleVideoClick}
      />

      {/* Darkened overlay when analysis is shown */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnalysis(false)}
          />
        )}
      </AnimatePresence>

      {/* Left side: Author info and caption */}
      <div className="absolute bottom-0 left-0 p-6 pb-20 max-w-2xl z-10">
        <div className="flex items-center gap-3 mb-3">
          {/* Author profile picture */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {(currentVideo as any).author_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-semibold">
              {(currentVideo as any).author_name || 'Unknown Author'}
            </p>
            <p className="text-gray-300 text-sm">
              {(currentVideo as any).author_follower_count?.toLocaleString() || '0'} followers
            </p>
          </div>
        </div>

        {/* Caption */}
        <p className="text-white text-sm leading-relaxed">
          {(currentVideo as any).caption || currentVideo.title || 'No caption'}
        </p>
      </div>

      {/* Right side: Stats */}
      <div className="absolute right-4 bottom-20 flex flex-col gap-6 z-10">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <Heart className="w-6 h-6 text-white" />
          </button>
          <span className="text-white text-xs font-semibold">
            {currentVideo.likesCount?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <span className="text-white text-xs font-semibold">
            {currentVideo.commentsCount?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <Bookmark className="w-6 h-6 text-white" />
          </button>
          <span className="text-white text-xs font-semibold">
            {(currentVideo as any).saves_count?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <button className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <Share2 className="w-6 h-6 text-white" />
          </button>
          <span className="text-white text-xs font-semibold">
            {currentVideo.sharesCount?.toLocaleString() || '0'}
          </span>
        </div>

        {/* Views */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <span className="text-white text-xs font-semibold">
            {currentVideo.viewsCount?.toLocaleString() || '0'}
          </span>
          <span className="text-gray-400 text-xs">views</span>
        </div>
      </div>

      {/* Play/Pause button */}
      <button
        onClick={togglePlayPause}
        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors z-10"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white ml-1" />
        )}
      </button>

      {/* Gemini Analysis Overlay */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-4 top-20 bottom-20 bg-dark-800/95 backdrop-blur-md rounded-2xl p-6 overflow-y-auto z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">🎯 Hook</h3>
                <p className="text-gray-300">{analysis.hook || 'No hook analysis available'}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">📱 Content Type</h3>
                <p className="text-gray-300">{analysis.content_type || 'N/A'}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">🎨 Visual Style</h3>
                <p className="text-gray-300">{analysis.visual_style || 'N/A'}</p>
              </div>

              {analysis.shotlist && analysis.shotlist.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🎬 Shotlist</h3>
                  <ul className="space-y-2">
                    {analysis.shotlist.map((shot: any, i: number) => (
                      <li key={i} className="text-gray-300 text-sm pl-4 border-l-2 border-purple-500">
                        {typeof shot === 'string' ? shot : shot.description || `${shot.scene || ''} ${shot.action || ''}`.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.engagement_factors && analysis.engagement_factors.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🔥 Engagement Factors</h3>
                  <ul className="space-y-2">
                    {analysis.engagement_factors.map((factor: string, i: number) => (
                      <li key={i} className="text-gray-300 text-sm pl-4 border-l-2 border-pink-500">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowAnalysis(false)}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
              >
                Close Analysis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video counter */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm z-10">
        {currentIndex + 1} / {videos.length}
      </div>
    </div>
  );
};
