import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Play, Volume2, VolumeX, X, ArrowLeft, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { LibraryVideo } from '../../types';
import { PhotoSlideshow } from './PhotoSlideshow';

interface FeedViewProps {
  videos: LibraryVideo[];
  isPublicMode?: boolean;
}

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const FeedView: React.FC<FeedViewProps> = ({ videos, isPublicMode = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Randomize videos when they first load
  const [shuffledVideos, setShuffledVideos] = useState<LibraryVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevIndexRef = useRef(0); // Track previous index to determine direction
  const hasShuffledRef = useRef(false); // Track if we've already shuffled
  const isNavigatingRef = useRef(false); // Prevent multiple navigations at once
  const [showAnalysis, setShowAnalysis] = useState(false);
  // Get initial mute state from localStorage, default to true for autoplay
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('feedVideoMuted');
    return saved !== null ? saved === 'true' : true;
  });
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(true); // Show by default until autoplay succeeds
  const hasUserInteractedRef = useRef(false); // Track if user has interacted
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWA, setIsPWA] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);
  const [showBrowserInstructions, setShowBrowserInstructions] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  // Detect if running as PWA
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');
    setIsPWA(isStandalone);
    
    // Check notification permission status
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      console.log('📱 Initial Notification permission:', currentPermission);
      setNotificationsEnabled(currentPermission === 'granted');
      
      // If already denied, show instructions immediately
      if (currentPermission === 'denied' && isStandalone) {
        console.log('⚠️ Notifications were previously denied');
      }
    }
    
    // Detect Instagram in-app browser
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isInstaInApp = /Instagram/i.test(userAgent);
    setIsInstagramBrowser(isInstaInApp);
    
    // Show browser instructions modal automatically if in Instagram browser
    if (isInstaInApp) {
      setShowBrowserInstructions(true);
    }
    
    // Only show PWA prompt on mobile and if not already installed and not in Instagram browser
    if (!isStandalone && !isInstaInApp && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // Show prompt instantly
      setShowPWAPrompt(true);
    }
  }, []);

  // Listen for beforeinstallprompt event (Android)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isIOS) {
      // Show iOS instructions
      setShowIOSInstructions(true);
      setShowPWAPrompt(false);
    } else if (deferredPrompt) {
      // Android - trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowPWAPrompt(false);
    }
  };

  const handleNotificationToggle = async () => {
    console.log('🔔 handleNotificationToggle called');
    console.log('isPWA:', isPWA);
    console.log('Notification in window:', 'Notification' in window);
    console.log('Current permission:', Notification.permission);
    
    if (!('Notification' in window)) {
      console.log('❌ This browser does not support notifications');
      alert('Your browser does not support notifications');
      return;
    }

    if (notificationsEnabled) {
      // User wants to disable - we can't revoke permission, just update state
      console.log('Disabling notifications (local only)');
      setNotificationsEnabled(false);
      localStorage.setItem('notificationsEnabled', 'false');
    } else {
      // Check if permission was already denied
      if (Notification.permission === 'denied') {
        console.log('❌ Permission already denied');
        if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          alert('Notifications were blocked.\n\nTo enable them, you need to:\n1. Delete the SwipeUp app from your home screen\n2. Reinstall it via Safari (Share → Add to Home Screen)\n3. Enable notifications when prompted');
        }
        return;
      }
      
      // User wants to enable - request permission
      try {
        console.log('Requesting notification permission...');
        
        // Check if we need service worker (for iOS PWA)
        if ('serviceWorker' in navigator) {
          console.log('Checking service worker...');
          const registration = await navigator.serviceWorker.ready;
          console.log('✅ Service Worker ready:', registration);
        } else {
          console.log('⚠️ No service worker support');
        }
        
        console.log('Calling Notification.requestPermission()...');
        const permission = await Notification.requestPermission();
        console.log('📱 Notification permission result:', permission);
        
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('notificationsEnabled', 'true');
          console.log('✅ Notifications enabled');
          
          // Show a test notification on iOS PWA
          if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            new Notification('SwipeUp', {
              body: 'Notifications are now enabled! You\'ll be notified about new trends.',
              icon: '/plane_new.png',
              badge: '/plane_new.png'
            });
          }
        } else if (permission === 'denied') {
          console.log('❌ Notification permission denied');
          // On iOS PWA, notifications were blocked - user needs to reinstall
          if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            alert('Notifications were blocked.\n\nTo enable them, you need to:\n1. Delete the SwipeUp app from your home screen\n2. Reinstall it via Safari (Share → Add to Home Screen)\n3. Enable notifications when prompted');
          }
        } else {
          console.log('⚠️ Notification permission dismissed');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  // Shuffle videos when they load (only once) and handle direct video link
  useEffect(() => {
    if (videos.length > 0 && !hasShuffledRef.current) {
      console.log('🔀 Shuffling videos:', videos.length);
      
      // Check if there's a specific video ID in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('video');
      
      if (videoId) {
        // Find the video in the list
        const videoIndex = videos.findIndex(v => v.id === videoId);
        
        if (videoIndex !== -1) {
          // Put the requested video first, then shuffle the rest
          const requestedVideo = videos[videoIndex];
          const otherVideos = videos.filter((_, i) => i !== videoIndex);
          const shuffledOthers = shuffleArray(otherVideos);
          setShuffledVideos([requestedVideo, ...shuffledOthers]);
          console.log('📍 Direct link: Starting with video', videoId);
        } else {
          // Video not found, just shuffle normally
          setShuffledVideos(shuffleArray(videos));
        }
        
        // Clean up the URL parameter
        urlParams.delete('video');
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, '', newUrl);
      } else {
        // Normal shuffle
        setShuffledVideos(shuffleArray(videos));
      }
      
      hasShuffledRef.current = true;
    }
  }, [videos]);

  const currentVideo = shuffledVideos[currentIndex];
  const prevVideo = currentIndex > 0 ? shuffledVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < shuffledVideos.length - 1 ? shuffledVideos[currentIndex + 1] : null;

  // Determine animation direction based on index change
  const animationDirection = currentIndex > prevIndexRef.current ? 'down' : 'up';
  
  // Log video state on index change (only when videos exist)
  useEffect(() => {
    if (shuffledVideos.length > 0) {
      console.log('📹 Video State:', {
        index: `${currentIndex}/${shuffledVideos.length - 1}`,
        direction: animationDirection,
        current: currentVideo?.id,
        prev: prevVideo?.id || 'none',
        next: nextVideo?.id || 'none'
      });
    }
  }, [currentIndex]);

  const handleBack = () => {
    // Try to go back in history, or fallback to /library
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/library');
    }
  };

  // Auto-play current video
  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        // Reset playing state
        setIsPlaying(true);
        
        // Always sync video element with user preference at start
        videoRef.current.muted = isMuted;
        
        try {
          await videoRef.current.play();
          console.log(`✅ Video autoplaying (${isMuted ? 'muted' : 'with sound'})`);
          setShowPlayOverlay(false);
          hasUserInteractedRef.current = true; // Mark as interacted
        } catch (err) {
          console.error('❌ Autoplay failed:', err);
          // If unmuted autoplay fails, try muted WITHOUT changing user preference
          if (!isMuted) {
            try {
              videoRef.current.muted = true;
              // Don't update isMuted state or localStorage - keep user preference
              await videoRef.current.play();
              console.log('✅ Video autoplaying (temporarily muted for this video only)');
              setShowPlayOverlay(false);
              hasUserInteractedRef.current = true; // Mark as interacted
            } catch (err2) {
              console.error('❌ Muted autoplay also failed:', err2);
              // Only show overlay if user hasn't interacted yet
              if (!hasUserInteractedRef.current) {
                setShowPlayOverlay(true);
                setIsPlaying(false);
              }
            }
          } else {
            // Only show overlay if user hasn't interacted yet
            if (!hasUserInteractedRef.current) {
              setShowPlayOverlay(true);
              setIsPlaying(false);
            }
          }
        }
      }
    };

    // Try to play immediately
    playVideo();
  }, [currentIndex, isMuted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if analysis modal is open
      if (showAnalysis) return;
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPrevious(); // Up arrow = previous video (scroll up)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToNext(); // Down arrow = next video (scroll down)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, shuffledVideos.length, showAnalysis]);

  // Scroll navigation - instant trigger with 100ms block
  useEffect(() => {
    let isBlocked = false;

    const handleWheel = (e: WheelEvent) => {
      // Don't navigate if analysis modal is open or blocked
      if (showAnalysis || isBlocked) {
        return;
      }
      
      e.preventDefault();
      
      // Threshold: need significant scroll to trigger navigation
      if (Math.abs(e.deltaY) > 10) {
        isBlocked = true;
        
        // Trigger navigation immediately
        if (e.deltaY > 0) {
          navigateToNext(); // Scroll down = next video
        } else {
          navigateToPrevious(); // Scroll up = previous video
        }
        
        // Unblock after 100ms
        setTimeout(() => {
          isBlocked = false;
        }, 100);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [currentIndex, shuffledVideos.length, showAnalysis]);

  // Touch navigation for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Don't prevent scrolling if analysis modal is open
      if (showAnalysis) return;
      
      // Prevent default scrolling behavior for video navigation
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (showAnalysis) return;
      
      touchEndY.current = e.changedTouches[0].clientY;
      const deltaY = touchStartY.current - touchEndY.current;
      
      // Minimum swipe distance (50px)
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          // Swiped up - next video
          navigateToNext();
        } else {
          // Swiped down - previous video
          navigateToPrevious();
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [currentIndex, shuffledVideos.length, showAnalysis]);

  const navigateToNext = () => {
    // Prevent rapid navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    if (currentIndex < shuffledVideos.length - 1) {
      setShowAnalysis(false);
      console.log('⬇️ FORWARD: Next video from bottom, current exits to top');
      // Update ref BEFORE changing index so direction calculation is correct
      prevIndexRef.current = currentIndex;
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reached the end - reshuffle and start over
      console.log('🔄 End of feed - reshuffling videos');
      setShowAnalysis(false);
      const newShuffle = shuffleArray(shuffledVideos);
      setShuffledVideos(newShuffle);
      prevIndexRef.current = 0;
      setCurrentIndex(0);
    }
    
    // Allow next navigation after animation completes
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  const navigateToPrevious = () => {
    // Prevent rapid navigation
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    
    if (currentIndex > 0) {
      setShowAnalysis(false);
      console.log('⬆️ BACK: Previous video from top, current exits to bottom');
      // Update ref BEFORE changing index so direction calculation is correct
      prevIndexRef.current = currentIndex;
      setCurrentIndex(currentIndex - 1);
    }
    
    // Allow next navigation after animation completes
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    console.log(`🔊 Toggling mute: ${isMuted} → ${newMutedState}`);
    setIsMuted(newMutedState);
    localStorage.setItem('feedVideoMuted', String(newMutedState));
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };

  const handleStatsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAnalysis(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create the direct link to this video in feed mode with public parameter
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/library?tab=feed&public=true&video=${currentVideo.id}`;
    
    try {
      // Try to use the Clipboard API
      await navigator.clipboard.writeText(shareUrl);
      console.log('✅ Link copied to clipboard:', shareUrl);
      
      // Show toast notification
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      
      // Fallback: Create a temporary input element
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      
      console.log('✅ Link copied to clipboard (fallback):', shareUrl);
      
      // Show toast notification
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1000);
    }
  };

  // Format large numbers (1.7M, 269K, etc.)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Check if video is liked
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!currentUser || !currentVideo) return;
      
      const { data, error } = await (supabase as any)
        .from('video_likes')
        .select('id')
        .eq('video_id', currentVideo.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      setIsLiked(!!data && !error);
    };
    
    checkLikeStatus();
  }, [currentVideo?.id, currentUser]);

  // Handle video tap - single tap = pause/play, double tap = like
  const handleVideoTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY && lastTapRef.current !== 0) {
      // Double tap detected - like the video!
      console.log('❤️ Double tap - Like!');
      toggleLike();
      lastTapRef.current = 0; // Reset to prevent triple-tap issues
    } else {
      // Potential single tap - wait to confirm
      console.log('👆 Single tap detected - waiting...');
      const tapTime = now;
      lastTapRef.current = tapTime;
      
      // Wait to see if it's a double tap
      setTimeout(() => {
        if (lastTapRef.current === tapTime) {
          // Find the video element - use ref or query selector as fallback
          const videoElement = videoRef.current || (e.target as HTMLElement).querySelector('video') || document.querySelector('video');
          
          // Still a single tap after delay - toggle play/pause
          console.log('⏯️ Confirmed single tap - Toggle play/pause', { 
            isPlaying, 
            hasVideoElement: !!videoElement,
            videoPaused: videoElement?.paused 
          });
          
          if (videoElement) {
            if (videoElement.paused) {
              console.log('▶️ Playing video');
              videoElement.play().catch(err => console.error('Play error:', err));
              setIsPlaying(true);
            } else {
              console.log('⏸️ Pausing video');
              videoElement.pause();
              setIsPlaying(false);
            }
          } else {
            console.error('❌ videoElement is null!');
          }
          lastTapRef.current = 0; // Reset after handling
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Toggle like status
  const toggleLike = async () => {
    if (!currentUser || !currentVideo) return;
    
    if (isLiked) {
      // Unlike
      await (supabase as any)
        .from('video_likes')
        .delete()
        .eq('video_id', currentVideo.id)
        .eq('user_id', currentUser.id);
      
      setIsLiked(false);
    } else {
      // Like
      await (supabase as any)
        .from('video_likes')
        .insert({
          video_id: currentVideo.id,
          user_id: currentUser.id
        });
      
      setIsLiked(true);
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
  };

  if (shuffledVideos.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black">
        <img 
          src="/NEU_PSD_swipeup-marketing_2.png" 
          alt="Logo" 
          className="w-32 h-32 object-contain mb-4"
        />
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p>No videos available</p>
      </div>
    );
  }

  // Parse Gemini analysis
  const analysis = (currentVideo as any).gemini_analysis || {};

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/95 overflow-hidden flex items-center justify-center z-50"
      style={{ 
        height: '100dvh', // Dynamic viewport height for mobile (fallback to 100vh in older browsers)
        width: '100vw',
        touchAction: 'pan-y',
        overscrollBehavior: 'none',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* 9:16 Container */}
      <div className="relative bg-black overflow-hidden" style={{ 
        width: '100%',
        maxWidth: 'calc(100dvh * 9 / 16)',
        height: '100dvh', // Dynamic viewport height for mobile
        aspectRatio: '9/16',
        touchAction: 'pan-y'
      }}>
        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent z-30 pointer-events-none" />
        
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent z-30 pointer-events-none" />
        
        {/* Seamless scroll container with pre-loaded videos */}
        <div className="relative w-full h-full overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ y: animationDirection === 'down' ? '100%' : '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: animationDirection === 'down' ? '-100%' : '100%' }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 40,
                mass: 1,
                restDelta: 0.01
              }}
              className="absolute inset-0"
              onClick={handleVideoTap}
              onTouchEnd={handleVideoTap}
            >
              {currentVideo.isPhotoPost && currentVideo.imageUrls && currentVideo.imageUrls.length > 0 ? (
                <PhotoSlideshow 
                  images={currentVideo.imageUrls} 
                  onTap={handleVideoTap}
                  indicatorPosition="above-caption"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={currentVideo.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  autoPlay
                  muted
                  poster={currentVideo.thumbnailStorageUrl || currentVideo.thumbnailUrl}
                />
              )}
              
              {/* Heart Animation on Double Tap */}
              <AnimatePresence>
                {showHeartAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="w-32 h-32 text-red-500 fill-red-500" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Play Overlay - shown when autoplay fails */}
              <AnimatePresence>
                {showPlayOverlay && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 cursor-pointer"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Immediately hide overlay
                      hasUserInteractedRef.current = true;
                      setShowPlayOverlay(false);
                      
                      if (videoRef.current) {
                        try {
                          // Try to play with sound first (user interaction allows this)
                          videoRef.current.muted = false;
                          setIsMuted(false);
                          localStorage.setItem('feedVideoMuted', 'false');
                          await videoRef.current.play();
                          setIsPlaying(true);
                          console.log('✅ Video playing with sound after user interaction');
                        } catch (err) {
                          console.error('Failed to play with sound:', err);
                          // Fallback to muted if sound fails
                          try {
                            videoRef.current.muted = true;
                            setIsMuted(true);
                            localStorage.setItem('feedVideoMuted', 'true');
                            await videoRef.current.play();
                            setIsPlaying(true);
                            console.log('✅ Video playing muted after user interaction');
                          } catch (err2) {
                            console.error('Failed to play:', err2);
                          }
                        }
                      }
                    }}
                    onTouchEnd={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Immediately hide overlay
                      hasUserInteractedRef.current = true;
                      setShowPlayOverlay(false);
                      
                      if (videoRef.current) {
                        try {
                          // Try to play with sound first (user interaction allows this)
                          videoRef.current.muted = false;
                          setIsMuted(false);
                          localStorage.setItem('feedVideoMuted', 'false');
                          await videoRef.current.play();
                          setIsPlaying(true);
                          console.log('✅ Video playing with sound after user interaction (touch)');
                        } catch (err) {
                          console.error('Failed to play with sound:', err);
                          // Fallback to muted if sound fails
                          try {
                            videoRef.current.muted = true;
                            setIsMuted(true);
                            localStorage.setItem('feedVideoMuted', 'true');
                            await videoRef.current.play();
                            setIsPlaying(true);
                            console.log('✅ Video playing muted after user interaction (touch)');
                          } catch (err2) {
                            console.error('Failed to play:', err2);
                          }
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-6 px-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl">
                          <Play className="w-12 h-12 text-black ml-1" fill="black" />
                        </div>
                        <p className="text-white text-xl font-bold text-center">Tap to Play</p>
                        <p className="text-gray-300 text-sm text-center">Video will play with sound</p>
                      </div>
                      
                      {/* Instagram Browser Warning */}
                      {isInstagramBrowser && !isPWA && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowBrowserInstructions(true);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowBrowserInstructions(true);
                          }}
                          className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                          style={{ backgroundColor: '#222d8c' }}
                        >
                          <ChevronRight className="w-5 h-5" />
                          <span>Open in Browser</span>
                        </motion.button>
                      )}

                      {/* PWA Install Prompt */}
                      {showPWAPrompt && !isPWA && !isInstagramBrowser && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInstallPWA();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInstallPWA();
                          }}
                          className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                          style={{ backgroundColor: '#222d8c' }}
                        >
                          <Download className="w-5 h-5" />
                          <span>Add to Home Screen</span>
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      )}

                      {/* Notification Toggle - Show when PWA is installed OR on desktop */}
                      {(isPWA || !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="flex items-center justify-between gap-4 px-6 py-3 bg-dark-800/80 backdrop-blur-sm rounded-full text-white shadow-lg"
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNotificationToggle();
                            }}
                            className="flex items-center justify-between gap-4 w-full"
                          >
                            <span className="text-sm font-medium">Notify me about new trends</span>
                            <div
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                notificationsEnabled ? 'bg-[#222d8c]' : 'bg-gray-600'
                              }`}
                            >
                              <motion.div
                                animate={{ x: notificationsEnabled ? 24 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full"
                              />
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Preload adjacent videos */}
          {prevVideo && (
            <video
              src={prevVideo.videoUrl}
              className="hidden"
              preload="auto"
            />
          )}
          {nextVideo && (
            <video
              src={nextVideo.videoUrl}
              className="hidden"
              preload="auto"
            />
          )}
        </div>

      {/* Darkened overlay when analysis is shown */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAnalysis(false)}
          />
        )}
      </AnimatePresence>

      {/* Left side: Author info and caption */}
      <div className="absolute bottom-0 left-0 p-6 pb-16 md:pb-28 pr-24 max-w-2xl z-10 scale-[0.8] md:scale-100 origin-bottom-left">
        <div 
          className="flex items-center gap-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            // Build profile URL based on platform with deep link support
            const username = currentVideo.accountUsername;
            if (username) {
              let profileUrl = '';
              
              if (currentVideo.platform === 'tiktok') {
                // TikTok deep link format - will open app on mobile, web on desktop
                // Format: tiktok://user?username=USERNAME (for app)
                // Fallback to web URL
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                  // Try to open in app first
                  profileUrl = `tiktok://user?username=${username}`;
                  // Set a timeout to fallback to web if app doesn't open
                  const fallbackUrl = `https://www.tiktok.com/@${username}`;
                  window.location.href = profileUrl;
                  setTimeout(() => {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                  }, 1500);
                  return;
                } else {
                  profileUrl = `https://www.tiktok.com/@${username}`;
                }
              } else if (currentVideo.platform === 'instagram') {
                // Instagram deep link format - will open app on mobile, web on desktop
                // Format: instagram://user?username=USERNAME (for app)
                // Fallback to web URL
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                  // Try to open in app first
                  profileUrl = `instagram://user?username=${username}`;
                  // Set a timeout to fallback to web if app doesn't open
                  const fallbackUrl = `https://www.instagram.com/${username}`;
                  window.location.href = profileUrl;
                  setTimeout(() => {
                    window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                  }, 1500);
                  return;
                } else {
                  profileUrl = `https://www.instagram.com/${username}`;
                }
              }
              
              if (profileUrl) {
                window.open(profileUrl, '_blank', 'noopener,noreferrer');
              }
            }
          }}
        >
          {/* Author profile picture */}
          {currentVideo.creatorAvatarUrl || currentVideo.creatorAvatarStorageUrl ? (
            <img
              src={currentVideo.creatorAvatarStorageUrl || currentVideo.creatorAvatarUrl}
              alt={currentVideo.accountName || currentVideo.accountUsername || 'Author'}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {(currentVideo.accountName || currentVideo.accountUsername || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold">
              {currentVideo.accountName || currentVideo.accountUsername || 'Unknown Author'}
            </p>
            <p className="text-gray-300 text-sm">
              {formatNumber(currentVideo.followerCount || 0)} followers
            </p>
          </div>
        </div>

        {/* Caption */}
        <div className="text-white text-sm leading-relaxed">
          <p className={showFullCaption ? '' : 'line-clamp-3'}>
            {currentVideo.description || currentVideo.title || 'No caption'}
          </p>
          {(currentVideo.description || currentVideo.title || '').length > 100 && (
            <button
              onClick={() => setShowFullCaption(!showFullCaption)}
              className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
            >
              {showFullCaption ? 'less' : 'more'}
            </button>
          )}
        </div>
      </div>

      {/* Right side: Stats */}
      <div className="absolute right-3 md:right-4 bottom-5 flex flex-col gap-5 z-10 items-end">
        {/* Views/Plays */}
        <div className="flex flex-col items-center gap-0.5" onClick={handleStatsClick}>
          <button className="p-2 transition-opacity hover:opacity-70">
            <Play className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.viewsCount || 0)}
          </span>
        </div>

        {/* Like */}
        <div className="flex flex-col items-center gap-0.5" onClick={toggleLike}>
          <button className="p-2 transition-opacity hover:opacity-70">
            <Heart 
              className={`w-5 h-5 drop-shadow-lg transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-white'
              }`} 
            />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.likesCount || 0)}
          </span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5" onClick={handleStatsClick}>
          <button className="p-2 transition-opacity hover:opacity-70">
            <MessageCircle className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.commentsCount || 0)}
          </span>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-0.5" onClick={handleStatsClick}>
          <button className="p-2 transition-opacity hover:opacity-70">
            <Bookmark className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.collectCount || 0)}
          </span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-0.5" onClick={handleShare}>
          <button className="p-2 transition-opacity hover:opacity-70">
            <Share2 className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.sharesCount || 0)}
          </span>
        </div>

        {/* Rotating Album Artwork with Sound Name */}
        <div className="flex items-center gap-2 justify-end">
          {/* Sound Name - Scrolling if too long */}
          <div className="max-w-[100px] overflow-hidden text-right">
            {(() => {
              const soundName = currentVideo.musicTitle 
                ? `${currentVideo.musicTitle}${currentVideo.musicAuthor ? ' - ' + currentVideo.musicAuthor : ''}`
                : (currentVideo.isOriginalSound ? 'Original Sound' : (currentVideo.title || 'Original Sound'));
              
              return soundName.length > 12 ? (
                <motion.div
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="whitespace-nowrap"
                >
                  <span className="text-white text-[10px] font-semibold drop-shadow-lg">
                    {soundName} • {soundName}
                  </span>
                </motion.div>
              ) : (
                <span className="text-white text-[10px] font-semibold drop-shadow-lg">
                  {soundName}
                </span>
              );
            })()}
          </div>
          
          {/* Rotating CD */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 flex-shrink-0"
          >
            {currentVideo.musicCoverThumb || currentVideo.musicCoverMedium || currentVideo.thumbnailStorageUrl || currentVideo.thumbnailUrl ? (
              <img
                src={currentVideo.musicCoverThumb || currentVideo.musicCoverMedium || currentVideo.thumbnailStorageUrl || currentVideo.thumbnailUrl}
                alt="Sound"
                className="w-full h-full rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-white flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Gemini Analysis Overlay */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute left-[7.5%] right-[7.5%] top-20 bottom-20 bg-dark-800/95 backdrop-blur-md rounded-2xl z-20 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowAnalysis(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center hover:bg-gray-700/50 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div 
              className="p-6 overflow-y-auto flex-1" 
              style={{ 
                WebkitOverflowScrolling: 'touch', 
                overscrollBehavior: 'contain'
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 pr-12">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">🎯 Hook</h3>
                <p className="text-gray-300">{analysis.hook || 'No hook analysis available'}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">📱 Content Type</h3>
                <p className="text-gray-300">{analysis.content_type || 'N/A'}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">🎨 Visual Style</h3>
                <p className="text-gray-300">{analysis.visual_style || 'N/A'}</p>
              </div>

              {analysis.shotlist && analysis.shotlist.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🎬 Shotlist</h3>
                  <ul className="space-y-1.5">
                    {analysis.shotlist.map((shot: any, i: number) => (
                      <li key={i} className="text-gray-300 text-sm pl-4 border-l-2 border-purple-500">
                        {typeof shot === 'string' ? shot : shot.description || `${shot.scene || ''} ${shot.action || ''}`.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.engagement_factors && analysis.engagement_factors.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🔥 Engagement Factors</h3>
                  <ul className="space-y-1.5">
                    {analysis.engagement_factors.map((factor: string, i: number) => (
                      <li key={i} className="text-gray-300 text-sm pl-4 border-l-2 border-pink-500">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button - Hidden in public mode */}
      {!isPublicMode && (
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 p-3 transition-opacity hover:opacity-70 z-10"
        >
          <ArrowLeft className="w-6 h-6 text-white drop-shadow-lg" />
        </button>
      )}

      {/* Volume control */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 p-3 transition-opacity hover:opacity-70 z-10"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white drop-shadow-lg" />
        ) : (
          <Volume2 className="w-6 h-6 text-white drop-shadow-lg" />
        )}
      </button>

      {/* Copied to Clipboard Toast - Inside video container */}
      <AnimatePresence>
        {showCopiedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 left-0 right-0 mx-auto w-fit px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-lg z-50"
          >
            <p className="text-white text-sm font-medium">Link copied to clipboard</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instagram Browser Instructions Modal */}
      <AnimatePresence>
        {showBrowserInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setShowBrowserInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Open in Browser</h3>
                <button
                  onClick={() => setShowBrowserInstructions(false)}
                  className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300">For the best experience, please open this page in your default browser (Safari or Chrome):</p>
                
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src="/IMG_3893.jpg" 
                    alt="Open in Browser Instructions"
                    className="w-full h-auto"
                  />
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(34, 45, 140, 0.2)', borderColor: 'rgba(34, 45, 140, 0.3)', borderWidth: '1px' }}>
                  <p className="text-xs text-gray-200">
                    💡 Tap the three dots (•••) in the top right corner and select "Open in Browser"
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBrowserInstructions(false)}
                className="w-full mt-6 px-6 py-3 rounded-lg text-white font-semibold hover:shadow-lg transition-all"
                style={{ backgroundColor: '#222d8c' }}
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-dark-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Add to Home Screen</h3>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300">Install this app on your iPhone for the best experience:</p>
                
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src="/Screenshot 2025-10-11 at 13.20.24.png" 
                    alt="iOS Installation Instructions"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6 px-6 py-3 rounded-lg text-white font-semibold hover:shadow-lg transition-all"
                style={{ backgroundColor: '#222d8c' }}
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
