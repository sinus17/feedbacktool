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
    <div className="absolute inset-0 pointer-events-none z-20">
      <div className="relative w-full h-full">
        {/* Platform indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/20 text-blue-500 text-xs font-medium">
          <Layout className="h-4 w-4" />
          <span>Safe Zones</span>
          <span className="text-gray-400">{aspectRatio}</span>
        </div>

        {/* Safe zone overlay image */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-75"
          style={{
            backgroundImage: 'url("https://swipeup-marketing.com/wp-content/uploads/2024/11/TikTok-Safe-Zones.png")'
          }}
        />
      </div>
    </div>
  );
};