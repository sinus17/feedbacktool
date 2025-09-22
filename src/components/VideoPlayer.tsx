import React, { useEffect, useRef, useState } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { SafeZoneOverlay } from './video/SafeZoneOverlay';
import { VideoControls } from './VideoControls';
import { processVideoUrl, getVideoErrorMessage, isSupabaseStorageUrl } from '../utils/video/player';

interface VideoPlayerProps {
  url: string;
  isDesktop: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);

    try {
      const processed = processVideoUrl(url);
      setProcessedUrl(processed);
    } catch (err) {
      console.error('Error processing video URL:', err);
      setError('Invalid video URL format. Please check the URL and try again.');
      setIsLoading(false);
    }
  }, [url]);

  // Set initial volume and attempt autoplay
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volumeLevel;
      
      const attemptAutoplay = async () => {
        try {
          if (!videoRef.current) return;
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.error('Autoplay failed:', err);
          setIsPlaying(false);
        }
      };

      if (!isLoading && !error && processedUrl) {
        attemptAutoplay();
      }
    }
  }, [isLoading, error, processedUrl]);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (controlsRef.current?.contains(e.target as Node)) {
      return;
    }
    togglePlayPause(e);
  };

  const togglePlayPause = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!videoRef.current || error) return;

    try {
      if (isPlaying) {
        await videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Video playback error:', err);
      setIsPlaying(false);
      setError('Failed to play video. Please try again.');
    }
  };

  const handleVolumeChange = (level: number) => {
    if (videoRef.current) {
      videoRef.current.volume = level;
      setVolumeLevel(level);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget;
    console.error('Video error:', videoElement.error);
    
    setIsLoading(false);
    setIsPlaying(false);
    
    const errorMessage = videoElement.error ? 
      getVideoErrorMessage({ 
        code: videoElement.error.code,
        message: videoElement.error.message
      }) : 
      'Failed to load video. Please check the URL and try again.';
    
    setError(errorMessage);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);

      // Detect aspect ratio
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      const ratio = videoWidth / videoHeight;

      if (ratio > 1.7) setAspectRatio('16:9');
      else if (ratio < 0.6) setAspectRatio('9:16');
      else if (ratio === 1) setAspectRatio('1:1');
      else setAspectRatio('4:5');
    }
  };

  if (!processedUrl || error) {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '9/16', maxHeight: '80vh' }}>
        <div className="text-white text-center p-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          <p className="whitespace-pre-line">{error || 'No video URL provided'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group cursor-pointer"
      style={{ aspectRatio: '9/16', maxHeight: '80vh' }}
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        src={processedUrl}
        className="w-full h-full object-contain"
        playsInline
        controls={false}
        preload="auto"
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={handleLoadedMetadata}
        onPlaying={() => {
          setIsLoading(false);
          setError(null);
        }}
        onWaiting={() => setIsLoading(true)}
        onEnded={() => setIsPlaying(false)}
        onError={handleVideoError}
        crossOrigin={isSupabaseStorageUrl(processedUrl) ? 'anonymous' : undefined}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <Loader className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      <SafeZoneOverlay 
        visible={showSafeZone}
        aspectRatio={aspectRatio}
      />

      <div 
        ref={controlsRef}
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-primary-500"
              disabled={!!error}
            />
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>

          <VideoControls
            isPlaying={isPlaying}
            volumeLevel={volumeLevel}
            isFullscreen={isFullscreen}
            showSafeZone={showSafeZone}
            error={error}
            onPlayPause={() => togglePlayPause({ preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent)}
            onVolumeChange={handleVolumeChange}
            onFullscreen={toggleFullscreen}
            onToggleSafeZone={() => setShowSafeZone(!showSafeZone)}
          />
        </div>
      </div>
    </div>
  );
};