import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Always start with dark mode enabled
    return true;
  });

  useEffect(() => {
    // Force dark mode class on document
    document.documentElement.classList.add('dark');

    // Watch for system preference changes but keep dark mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Keep dark mode enabled regardless of system preference
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDarkMode;
}