import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoSlideshowProps {
  images: string[];
  onTap?: (e: React.MouseEvent | React.TouchEvent) => void;
  indicatorPosition?: 'bottom' | 'above-caption'; // Position for slide indicators
  onSlideshowComplete?: () => void; // Called when slideshow reaches the end
  onUserInteraction?: () => void; // Called when user manually interacts with slideshow
}

export const PhotoSlideshow = ({ images, onTap, indicatorPosition = 'bottom', onSlideshowComplete, onUserInteraction }: PhotoSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  // Auto-advance slides every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % images.length;
        
        // If we're at the last slide and moving to first, slideshow completed
        if (prev === images.length - 1 && nextIndex === 0 && !hasCompletedOnce) {
          console.log('📸 Slideshow completed - calling onSlideshowComplete');
          setHasCompletedOnce(true);
          onSlideshowComplete?.();
        }
        
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [images.length, hasCompletedOnce, onSlideshowComplete]);

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUserInteraction?.(); // Mark as user interaction
    setDirection(1);
    setCurrentIndex((prev) => {
      const nextIndex = (prev + 1) % images.length;
      
      // If manually navigating to last slide, mark as completed
      if (prev === images.length - 1 && nextIndex === 0 && !hasCompletedOnce) {
        console.log('📸 Slideshow manually completed - calling onSlideshowComplete');
        setHasCompletedOnce(true);
        onSlideshowComplete?.();
      }
      
      return nextIndex;
    });
  };

  const goToPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUserInteraction?.(); // Mark as user interaction
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    } else {
      // If not a swipe, treat as tap
      onTap?.(e);
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div 
      className="relative w-full h-full bg-black" 
      onClick={onTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image Slideshow */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          alt={`Slide ${currentIndex + 1}`}
        />
      </AnimatePresence>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {images.length > 1 && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-10 flex gap-2 ${
          indicatorPosition === 'above-caption' ? 'bottom-64' : 'bottom-4'
        }`}>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onUserInteraction?.(); // Mark as user interaction
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
