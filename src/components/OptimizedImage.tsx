import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackInitial?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackInitial = 'U'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Supabase doesn't support image transforms, so we'll use CSS optimization instead
  const getOptimizedImageUrl = (url: string) => {
    return url;
  };

  // Preload image when in view
  useEffect(() => {
    if (isInView && src && !isLoaded && !hasError) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setHasError(true);
      img.src = getOptimizedImageUrl(src);
    }
  }, [isInView, src, isLoaded, hasError]);

  if (hasError || !src) {
    return (
      <div className={`bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center ${className}`}>
        <span className="text-primary-600 dark:text-primary-400 font-medium text-xs">
          {fallbackInitial}
        </span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isLoaded && isInView && (
        <div className={`absolute inset-0 bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center ${className}`}>
          <div className="animate-pulse w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 object-cover`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          style={{ 
            maxWidth: '40px', 
            maxHeight: '40px'
          }}
        />
      )}
    </div>
  );
};
