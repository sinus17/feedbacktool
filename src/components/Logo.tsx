import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8" }) => {
  return (
    <img 
      src="/plane.png"
      alt="Logo"
      className={className}
    />
  );
};