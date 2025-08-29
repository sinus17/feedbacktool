import React from 'react';
import { Volume2, Volume1, Volume, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  level: number;
  onChange: (level: number) => void;
  disabled?: boolean;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ 
  level, 
  onChange,
  disabled = false 
}) => {
  // Define volume levels
  const VOLUME_LEVELS = [0, 0.1, 0.3, 0.75];

  const getVolumeIcon = () => {
    if (level === 0) return <VolumeX className="h-6 w-6" />;
    if (level <= 0.1) return <Volume className="h-6 w-6" />;
    if (level <= 0.3) return <Volume1 className="h-6 w-6" />;
    return <Volume2 className="h-6 w-6" />;
  };

  const handleClick = () => {
    if (disabled) return;
    
    // Find current level index
    const currentIndex = VOLUME_LEVELS.indexOf(level);
    // Get next level (cycle back to start if at end)
    const nextIndex = (currentIndex + 1) % VOLUME_LEVELS.length;
    onChange(VOLUME_LEVELS[nextIndex]);
  };

  return (
    <button
      onClick={handleClick}
      className="text-white hover:text-primary-500 transition-colors"
      disabled={disabled}
      title={`Volume: ${Math.round(level * 100)}%`}
    >
      {getVolumeIcon()}
    </button>
  );
};