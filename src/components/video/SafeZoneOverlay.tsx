import React from 'react';
import { Layout } from 'lucide-react';

interface SafeZoneOverlayProps {
  visible: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
}

export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({ 
  visible, 
  aspectRatio = '9:16'
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="relative w-full h-full">
        {/* Platform indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/20 text-blue-500 text-xs font-medium z-10">
          <Layout className="h-4 w-4" />
          <span>Safe Zones</span>
          <span className="text-gray-400">{aspectRatio}</span>
        </div>

        {/* Safe zone overlay image */}
        <img
          src="/safezone.webp"
          alt="Safe Zone Overlay"
          className="absolute inset-0 w-full h-full object-contain opacity-75"
          style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
};