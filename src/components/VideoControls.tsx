import React from 'react';
import { Play, Pause, Maximize, Minimize, Layout } from 'lucide-react';
import { VolumeControl } from './video/VolumeControl';

interface VideoControlsProps {
  isPlaying: boolean;
  volumeLevel: number;
  isFullscreen: boolean;
  showSafeZone: boolean;
  error: string | null;
  onPlayPause: () => void;
  onVolumeChange: (level: number) => void;
  onFullscreen: () => void;
  onToggleSafeZone: () => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  volumeLevel,
  isFullscreen,
  showSafeZone,
  error,
  onPlayPause,
  onVolumeChange,
  onFullscreen,
  onToggleSafeZone
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onPlayPause}
          className="text-white hover:text-primary-500 transition-colors"
          disabled={!!error}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </button>
        
        <VolumeControl
          level={volumeLevel}
          onChange={onVolumeChange}
          disabled={!!error}
        />

        <button
          onClick={onToggleSafeZone}
          className={`text-white hover:text-primary-500 transition-colors ${
            showSafeZone ? 'text-primary-500' : ''
          }`}
          disabled={!!error}
          title="Toggle Safe Zone"
        >
          <Layout className="h-6 w-6" />
        </button>
      </div>

      <button
        onClick={onFullscreen}
        className="text-white hover:text-primary-500 transition-colors"
        disabled={!!error}
      >
        {isFullscreen ? (
          <Minimize className="h-6 w-6" />
        ) : (
          <Maximize className="h-6 w-6" />
        )}
      </button>
    </div>
  );
};