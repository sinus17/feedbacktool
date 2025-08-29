import React from 'react';

interface AdTagIconProps {
  className?: string;
}

export const AdTagIcon: React.FC<AdTagIconProps> = ({ className = "h-4 w-4" }) => {
  return (
    <div className={`inline-flex items-center justify-center bg-green-500 text-white text-xs font-bold rounded px-1.5 py-0.5 ${className}`}>
      AD
    </div>
  );
};