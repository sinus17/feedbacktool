import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => {
  return (
    <svg 
      viewBox="0 0 1372 1372" 
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: 'rotate(180deg) scaleX(-1)' }}
    >
      <path d="M670.2 1008.7L60.2 777.2l0.2-0.8 334.5-209.4c1.8-0.9 40.3 24.7 326 216.7 178.1 119.8 325.2 218.7 326.8 219.8 1.7 1.1-4.5-5.6-13.6-14.9-30.6-31.2-432.8-437.5-473.6-478.5l-40.5-40.6 33.3-111.9c18.3-61.5 33.4-112.1 33.5-112.3 0.2-0.3 111.2 99.8 121 109.1l4.1 3.9 171.8-99.1c94.5-54.4 172-98.9 172.1-98.7 0.4 0.4 227.4 1075.4 227.4 1076.8 0 0.5-0.6 0.9-1.2 0.8-0.7 0-275.9-103.6-611.6-230.2z"/>
    </svg>
  );
};