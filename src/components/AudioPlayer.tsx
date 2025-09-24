import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, Download } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  onDelete?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, fileName, onDelete }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;

    // Initialize WaveSurfer
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      cursorColor: '#1d4ed8',
      barWidth: 2,
      barRadius: 3,
      height: 60,
      normalize: true,
      mediaControls: false,
    });

    // Load audio
    wavesurfer.current.load(audioUrl);

    // Event listeners
    wavesurfer.current.on('ready', () => {
      setIsLoading(false);
      setDuration(wavesurfer.current?.getDuration() || 0);
    });

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    
    wavesurfer.current.on('audioprocess', () => {
      setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
    });

    wavesurfer.current.on('interaction', () => {
      setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
    });

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-4 border border-gray-200 dark:border-gray-700 relative ${
      isLoading ? 'overflow-hidden' : ''
    }`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Processing audio...</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Generating waveform</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center justify-between mb-3 ${isLoading ? 'blur-sm' : ''}`}>
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {fileName}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Download"
          >
            <Download className="h-4 w-4 text-gray-500" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={isLoading}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-500 disabled:opacity-50"
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Waveform */}
      <div className={`relative ${isLoading ? 'blur-sm' : ''}`}>
        {/* Loading Waveform Animation */}
        {isLoading && (
          <div className="h-[60px] flex items-center justify-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="bg-blue-300 dark:bg-blue-600 rounded-full animate-pulse"
                style={{
                  width: '2px',
                  height: `${Math.random() * 40 + 10}px`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: '1.5s',
                }}
              />
            ))}
          </div>
        )}
        <div ref={waveformRef} className={`w-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} />
      </div>

      {/* Controls */}
      <div className={`flex items-center justify-between mt-3 ${isLoading ? 'blur-sm' : ''}`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>
          <div className="text-sm text-gray-500">
            {isLoading ? '--:-- / --:--' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
          </div>
        </div>
      </div>
    </div>
  );
};
