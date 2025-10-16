import * as React from 'react';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ 
  orientation = 'horizontal',
  className = ''
}) => {
  const baseClasses = orientation === 'horizontal' 
    ? 'h-px w-full bg-gray-200 dark:bg-gray-700'
    : 'w-px h-full bg-gray-200 dark:bg-gray-700';
  
  return <div className={`${baseClasses} ${className}`} />;
};
