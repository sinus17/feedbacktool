import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Play, X, ArrowLeft, Download, ChevronRight, Bell, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { LibraryVideo } from '../../types';
import { PhotoSlideshow } from './PhotoSlideshow';
import { VAPID_PUBLIC_KEY } from '../../config/vapid';
// @ts-ignore - Library has type issues but works fine
import { useSubscribe } from 'react-pwa-push-notifications';

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
  const hasShuffledRef = useRef(false);
  const [shuffledVideos, setShuffledVideos] = useState<LibraryVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(true); // Show by default until autoplay succeeds
  const hasUserInteractedRef = useRef(false); // Track if user has interacted
  const hasInteractedWithCurrentVideoRef = useRef(false); // Track interaction with current video for auto-scroll
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWA, setIsPWA] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isInstagramBrowser, setIsInstagramBrowser] = useState(false);
  const [showBrowserInstructions, setShowBrowserInstructions] = useState(false);
  const [showAnalysisTooltip, setShowAnalysisTooltip] = useState(false);
  const [language, setLanguage] = useState<'de' | 'en'>(() => {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLanguage = urlParams.get('language');
    if (urlLanguage === 'en' || urlLanguage === 'de') {
      return urlLanguage as 'de' | 'en';
    }
    // Fall back to localStorage
    const saved = localStorage.getItem('analysisLanguage');
    return (saved === 'en' ? 'en' : 'de') as 'de' | 'en';
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const prevIndexRef = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);

  // Initialize push notification hook
  const { getSubscription } = useSubscribe({ publicKey: VAPID_PUBLIC_KEY });

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
      
      // User wants to enable - use the hook
      try {
        console.log('Getting push subscription via hook...');
        const subscription = await getSubscription();
        console.log('✅ Push subscription created:', JSON.stringify(subscription));
        
        // Save subscription to database
        const { error: dbError } = await supabase.rpc('upsert_push_subscription', {
          p_user_id: currentUser?.id || 'anonymous',
          p_endpoint: subscription.endpoint,
          p_subscription: subscription.toJSON()
        });
        
        if (dbError) {
          console.error('Failed to save subscription:', dbError);
        } else {
          console.log('✅ Subscription saved to database');
        }
        
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
        
        // Show a test notification on iOS PWA
        if (isPWA && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          new Notification('SwipeUp', {
            body: 'Notifications are now enabled! You\'ll be notified about new trends.',
            icon: '/plane_new.png',
            badge: '/plane_new.png'
          });
        }
      } catch (error: any) {
        console.error('Error subscribing to push notifications:', error);
        
        // Handle specific errors from the hook
        if (error.message?.includes('denied')) {
          alert('Notifications were blocked.\n\nTo enable them, you need to:\n1. Delete the SwipeUp app from your home screen\n2. Reinstall it via Safari (Share → Add to Home Screen)\n3. Enable notifications when prompted');
        } else {
          alert('Failed to enable notifications. Please try again.');
        }
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
      // Reset interaction tracking when video changes
      hasInteractedWithCurrentVideoRef.current = false;
      console.log('🔄 Reset interaction tracking for new video');
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

  // Handle slideshow completion for auto-scroll
  const handleSlideshowComplete = () => {
    console.log('📸 Slideshow completed, checking if should auto-scroll');
    if (!hasInteractedWithCurrentVideoRef.current && !showAnalysis) {
      console.log('✅ Auto-scrolling to next video after slideshow');
      setTimeout(() => navigateToNext(), 500);
    } else {
      console.log('❌ Not auto-scrolling - user has interacted');
    }
  };

  // Handle user interaction with slideshow
  const handleSlideshowInteraction = () => {
    hasInteractedWithCurrentVideoRef.current = true;
    console.log('🖱️ User interacted with slideshow - marked as interacted');
  };

  // Note: Removed auto-scroll for Tap to Play overlay
  // Users should manually interact to start playback

  // Auto-play current video
  useEffect(() => {
    const playVideo = async () => {
      const video = videoRef.current;
      if (!video) return;
      
      // Reset playing state
      setIsPlaying(true);
      
      // Add ended event listener for auto-scroll
      const handleVideoEnded = () => {
        console.log('🎬 Video ended, checking if should auto-scroll');
        if (!hasInteractedWithCurrentVideoRef.current && !showAnalysis) {
          console.log('✅ Auto-scrolling to next video');
          setTimeout(() => navigateToNext(), 500);
        } else {
          console.log('❌ Not auto-scrolling - user has interacted');
        }
      };
      
      video.addEventListener('ended', handleVideoEnded);
      
      // Always sync video element with user preference at start
      video.muted = isMuted;
      
      try {
        // Don't call load() - it interrupts playback
        // Just play directly, browser will load automatically
        await video.play();
        console.log(`✅ Video autoplaying (${isMuted ? 'muted' : 'with sound'})`);
        setShowPlayOverlay(false);
        hasUserInteractedRef.current = true; // Mark as interacted
        
        // Show tooltip on first video after 1 second
        if (currentIndex === 0) {
          setTimeout(() => setShowAnalysisTooltip(true), 1000);
          // Auto-hide after 5 seconds
          setTimeout(() => setShowAnalysisTooltip(false), 6000);
        }
      } catch (err) {
        console.error('❌ Autoplay failed:', err);
        // If unmuted autoplay fails, try muted
        if (!isMuted) {
          try {
            video.muted = true;
            await video.play();
            console.log('⚠️ Video autoplaying muted (autoplay with sound failed)');
            setShowPlayOverlay(false);
            hasUserInteractedRef.current = true;
            
            // After successful muted play, try to unmute if user wants sound
            setTimeout(() => {
              if (videoRef.current && !isMuted) {
                videoRef.current.muted = false;
                console.log('🔊 Attempting to unmute after initial muted autoplay');
              }
            }, 500);
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
      
      // Return cleanup function
      return () => {
        video.removeEventListener('ended', handleVideoEnded);
      };
    };

    // Small delay to ensure video element is ready
    const timer = setTimeout(() => {
      playVideo();
    }, 50);
    
    return () => {
      clearTimeout(timer);
    };
  }, [currentIndex, isMuted, showAnalysis]);

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


  const handleStatsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAnalysis(true);
    setShowAnalysisTooltip(false); // Hide tooltip when clicked
    hasInteractedWithCurrentVideoRef.current = true; // Mark as interacted
    console.log('👁️ User opened analysis - marked as interacted');
  };

  // Handle fullscreen toggle
  const handleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        console.log('✅ Entered fullscreen mode');
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        setIsFullscreen(false);
        console.log('✅ Exited fullscreen mode');
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes (e.g., user pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
              hasInteractedWithCurrentVideoRef.current = true; // Mark as interacted when paused
              console.log('⏸️ User paused video - marked as interacted');
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
    
    hasInteractedWithCurrentVideoRef.current = true; // Mark as interacted when liked
    console.log('❤️ User liked/unliked video - marked as interacted');
    
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

  // Parse Gemini analysis based on selected language
  const rawAnalysis = language === 'en' 
    ? ((currentVideo as any).gemini_analysis_en || (currentVideo as any).gemini_analysis)
    : (currentVideo as any).gemini_analysis;
  
  let analysis: any = {};
  if (rawAnalysis) {
    try {
      analysis = typeof rawAnalysis === 'string' ? JSON.parse(rawAnalysis) : rawAnalysis;
      console.log('📊 Parsed analysis in feed:', analysis);
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      analysis = {};
    }
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden flex items-center justify-center z-50 transition-colors ${
        showAnalysis ? 'bg-black' : 'bg-black/95'
      }`}
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
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black via-black/30 to-transparent z-10 pointer-events-none" />
        
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/70 to-transparent z-10 pointer-events-none" />
        
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
                <>
                  <PhotoSlideshow 
                    images={currentVideo.imageUrls} 
                    onTap={handleVideoTap}
                    indicatorPosition="above-caption"
                    onSlideshowComplete={handleSlideshowComplete}
                    onUserInteraction={handleSlideshowInteraction}
                  />
                  {/* Audio for photo posts */}
                  {currentVideo.musicUrl && (
                    <audio
                      ref={videoRef as any}
                      src={currentVideo.musicUrl}
                      loop
                      autoPlay
                      className="hidden"
                    />
                  )}
                </>
              ) : (
                <video
                  ref={videoRef}
                  src={currentVideo.videoUrl}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                  poster={currentVideo.thumbnailStorageUrl || currentVideo.thumbnailUrl}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Toggle play/pause on single click
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play().then(() => {
                          setIsPlaying(true);
                          console.log('▶️ Video resumed');
                        }).catch(err => {
                          console.error('Failed to play:', err);
                        });
                      } else {
                        videoRef.current.pause();
                        setIsPlaying(false);
                        console.log('⏸️ Video paused');
                      }
                    }
                  }}
                />
              )}
              
              {/* Adaptable Badge */}
              {(currentVideo as any).is_adaptable && !showAnalysis && (
                <div 
                  className="absolute top-[116px] left-0 right-0 mx-auto w-fit px-3.5 py-2 bg-yellow-500/20 backdrop-blur-sm text-yellow-400 text-sm font-bold rounded-md border border-yellow-500/40 z-40 flex items-center gap-1.5 cursor-pointer hover:bg-yellow-500/30 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAnalysis(true);
                  }}
                >
                  ⚡ Adaptable for Music
                </div>
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
                          style={{ backgroundColor: '#0000fe' }}
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
                          style={{ backgroundColor: '#0000fe' }}
                        >
                          <Download className="w-5 h-5" />
                          <span>Add to Home Screen</span>
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      )}

                      {/* Notification Button - Show when PWA is installed OR on desktop AND not enabled */}
                      {(isPWA || !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) && !notificationsEnabled && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleNotificationToggle();
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleNotificationToggle();
                          }}
                          className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                          style={{ backgroundColor: '#0000fe' }}
                        >
                          <Bell className="w-5 h-5" />
                          <span>Notify me about new trends</span>
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
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
          {/* Author profile picture - Only use storage URL to prevent external CDN requests */}
          {currentVideo.creatorAvatarStorageUrl ? (
            <img
              src={currentVideo.creatorAvatarStorageUrl}
              alt={currentVideo.accountName || currentVideo.accountUsername || 'Author'}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {(currentVideo.accountName || currentVideo.accountUsername || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-white font-semibold">
                {currentVideo.accountName || currentVideo.accountUsername || 'Unknown Author'}
              </p>
              {(currentVideo as any).authorVerified && (
                <svg 
                  className="w-4 h-4 flex-shrink-0" 
                  viewBox="0 0 640 640"
                  fill="#3b81f6"
                >
                  <path d="M320 64C356.8 64 388.8 84.7 404.9 115.1C437.8 105 475 112.9 501 139C527 165.1 535 202.3 524.9 235.2C555.3 251.2 576 283.2 576 320C576 356.8 555.3 388.8 524.9 404.9C535 437.8 527 475 501 501C475 527 437.7 535 404.8 524.9C388.8 555.3 356.8 576 320 576C283.2 576 251.2 555.3 235.1 524.9C202.2 535 165 527 139 501C113 475 105 437.7 115.1 404.8C84.7 388.8 64 356.8 64 320C64 283.2 84.7 251.2 115.1 235.1C105 202.2 112.9 165 139 139C165.1 113 202.3 105 235.2 115.1C251.2 84.7 283.2 64 320 64zM410.9 228.6C400.2 220.8 385.2 223.2 377.4 233.9L291.8 351.6L265.3 324.2C256.1 314.7 240.9 314.4 231.4 323.6C221.9 332.8 221.6 348 230.8 357.5L277.2 405.5C282.1 410.6 289 413.3 296.1 412.8C303.2 412.3 309.7 408.7 313.9 403L416.2 262.1C424 251.4 421.6 236.4 410.9 228.6z"/>
                </svg>
              )}
            </div>
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
        <div 
          className={`flex flex-col items-center gap-0.5 relative transition-all duration-300 ${
            showAnalysisTooltip ? 'bg-white/10 rounded-full p-1 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : ''
          }`}
          onClick={handleStatsClick}
        >
          <button className="p-2 transition-opacity hover:opacity-70">
            <MessageCircle className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {formatNumber(currentVideo.commentsCount || 0)}
          </span>
          
          {/* Tooltip with arrow */}
          <AnimatePresence>
            {showAnalysisTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute right-16 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnalysis(true);
                  setShowAnalysisTooltip(false);
                }}
              >
                {/* Tooltip text with arrow inside */}
                <div className="bg-[#0000fe] backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg whitespace-nowrap flex items-center gap-2 hover:bg-[#0000cc] transition-colors">
                  Click to open analysis
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 fill-current">
                    <path d="M566.6 342.6C579.1 330.1 579.1 309.8 566.6 297.3L406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3C348.8 149.8 348.8 170.1 361.3 182.6L466.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L466.7 352L361.3 457.4C348.8 469.9 348.8 490.2 361.3 502.7C373.8 515.2 394.1 515.2 406.6 502.7L566.6 342.7z"/>
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

        {/* Fullscreen */}
        <div className="flex flex-col items-center gap-0.5" onClick={handleFullscreen}>
          <button className="p-2 transition-opacity hover:opacity-70">
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-white drop-shadow-lg" />
            ) : (
              <Maximize className="w-5 h-5 text-white drop-shadow-lg" />
            )}
          </button>
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
              {/* Language Toggle */}
              <div className="flex justify-start gap-1 mb-4">
                <button
                  onClick={() => {
                    setLanguage('de');
                    localStorage.setItem('analysisLanguage', 'de');
                  }}
                  className={`px-2 py-1 rounded text-sm transition-colors hover:bg-dark-600 ${
                    language === 'de' ? 'bg-dark-600' : ''
                  }`}
                  title="Deutsch"
                >
                  🇩🇪
                </button>
                <button
                  onClick={() => {
                    setLanguage('en');
                    localStorage.setItem('analysisLanguage', 'en');
                  }}
                  className={`px-2 py-1 rounded text-sm transition-colors hover:bg-dark-600 ${
                    language === 'en' ? 'bg-dark-600' : ''
                  }`}
                  title="English"
                >
                  🇺🇸
                </button>
              </div>

              {/* Trending Video Analysis */}
              {analysis.original_concept && (
                <>
                  {analysis.original_concept && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-1">💡 Original Concept</h3>
                      <p className="text-sm text-gray-300">{analysis.original_concept}</p>
                    </div>
                  )}
                  
                  {analysis.why_it_went_viral && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-1">🚀 Why It Went Viral</h3>
                      <p className="text-sm text-gray-300">{analysis.why_it_went_viral}</p>
                    </div>
                  )}
                  
                  {analysis.music_adaptation && (
                    <div className="bg-[#0000fe]/20 p-4 rounded-lg border border-[#3b81f6]/30 relative">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[#3b81f6]">🎵 Music Adaptation Strategy</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-md border border-yellow-500/40 flex-shrink-0">
                          ⚡ Adaptable
                        </span>
                      </div>
                      
                      {analysis.music_adaptation.core_mechanic && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-blue-300 mb-1">Core Mechanic</h4>
                          <p className="text-sm text-gray-300">{analysis.music_adaptation.core_mechanic}</p>
                        </div>
                      )}
                      
                      {analysis.music_adaptation.how_to_flip && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-blue-300 mb-1">How to Adapt</h4>
                          <p className="text-sm text-gray-300 whitespace-pre-line">{analysis.music_adaptation.how_to_flip}</p>
                        </div>
                      )}
                      
                      {analysis.music_adaptation.example_scenarios && Array.isArray(analysis.music_adaptation.example_scenarios) && (
                        <div>
                          <h4 className="text-xs font-medium text-blue-300 mb-2">Example Scenarios</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {analysis.music_adaptation.example_scenarios.map((scenario: string, i: number) => (
                              <li key={i} className="text-sm text-gray-300">{scenario}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {analysis.best_song_topics && Array.isArray(analysis.best_song_topics) && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-2">🎼 Best Song Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.best_song_topics.map((topic: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-[#3b81f6]/20 text-[#3b81f6] rounded-full text-xs">{topic}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.production_requirements && Array.isArray(analysis.production_requirements) && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-2">🎬 Production Requirements</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.production_requirements.map((req: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300">{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.shotlist_template && Array.isArray(analysis.shotlist_template) && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-2">📋 Shotlist Template</h3>
                      <ul className="list-decimal list-inside space-y-2">
                        {analysis.shotlist_template.map((shot: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 pl-2">{shot}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.engagement_factors && Array.isArray(analysis.engagement_factors) && (
                    <div>
                      <h3 className="text-sm font-medium text-[#3b81f6] mb-2">🔥 Engagement Factors</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.engagement_factors.map((factor: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              
              {/* Regular Video Analysis */}
              {!analysis.original_concept && analysis.hook && (
                <div>
                  <h3 className="text-sm font-medium text-[#3b81f6] mb-1">🎣 Hook</h3>
                  <p className="text-sm text-gray-300">{analysis.hook}</p>
                </div>
              )}
              
              {analysis.content_type && (
                <div>
                  <h3 className="text-sm font-medium text-[#3b81f6] mb-1">📹 Content Type</h3>
                  <p className="text-sm text-gray-300">{analysis.content_type}</p>
                </div>
              )}
              
              {analysis.visual_style && (
                <div>
                  <h3 className="text-sm font-medium text-[#3b81f6] mb-1">🎨 Visual Style</h3>
                  <p className="text-sm text-gray-300">{analysis.visual_style}</p>
                </div>
              )}
              
              {analysis.shotlist && Array.isArray(analysis.shotlist) && (
                <div>
                  <h3 className="text-sm font-medium text-[#3b81f6] mb-2">🎬 Shotlist</h3>
                  <ul className="list-decimal list-inside space-y-2">
                    {analysis.shotlist.map((shot: any, i: number) => (
                      <li key={i} className="text-sm text-gray-300 pl-2">
                        {typeof shot === 'string' ? shot : (
                          shot.description || `${shot.scene || ''} ${shot.action || ''}`.trim()
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {!analysis.original_concept && analysis.engagement_factors && Array.isArray(analysis.engagement_factors) && (
                <div>
                  <h3 className="text-sm font-medium text-[#3b81f6] mb-2">🔥 Why This Works</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.engagement_factors.map((factor: string, i: number) => (
                      <li key={i} className="text-sm text-gray-300">{factor}</li>
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

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 254, 0.2)', borderColor: 'rgba(0, 0, 254, 0.3)', borderWidth: '1px' }}>
                  <p className="text-xs text-gray-200">
                    💡 Tap the three dots (•••) in the top right corner and select "Open in Browser"
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBrowserInstructions(false)}
                className="w-full mt-6 px-6 py-3 rounded-lg text-white font-semibold hover:shadow-lg transition-all"
                style={{ backgroundColor: '#0000fe' }}
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
                style={{ backgroundColor: '#0000fe' }}
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
