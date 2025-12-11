// @ts-nocheck - Supabase type definitions need updating
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, AlertCircle, Check, Instagram } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { isSupabaseStorageUrl } from '../utils/video/player'; 
import { generateThumbnailFromUrl } from '../utils/video/generateThumbnailFromUrl';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { fetchInstagramThumbnail } from '../utils/fetchInstagramThumbnail';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoName?: string;
  platform: string;
  creativeId?: string;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'user';
  content: string;
  timestamp: Date;
  platform?: 'instagram' | 'tiktok';
  isNew?: boolean; // Indicates if this URL was added after the last activation
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  videoName,
  platform,
  creativeId
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const { fetchAdCreatives, adCreatives } = useStore();
  
  // Fetch existing data for this creative
  useEffect(() => {
    if (isOpen && creativeId) {
      const fetchCreativeData = async () => {
        try {
          // Fetch creative data including thumbnail and timestamp data
          const { data, error } = await supabase.from('ad_creatives')
            .select('merged_instagram_reel_url, merged_tiktok_auth_code, thumbnail_url, instagram_thumbnail_url, tiktok_thumbnail_url, instagram_url_updated_at, tiktok_url_updated_at, last_activated_at, status')
            .eq('id', creativeId).single();

          if (error) throw error;
          
          // If this is an Instagram URL and we don't have a thumbnail yet, try to fetch one
          if (platform === 'instagram' && !data.instagram_thumbnail_url && videoUrl.includes('instagram.com')) {
            try {
              console.log('Fetching Instagram thumbnail for URL in preview modal:', videoUrl);
              // Pass the creative ID so the Edge Function can update the database directly
              fetchInstagramThumbnail(videoUrl, creativeId)
                .then(() => fetchAdCreatives())
                .catch(err => console.error('Error fetching Instagram thumbnail:', err));
            } catch (thumbnailError) {
              console.error('Error fetching Instagram thumbnail:', thumbnailError);
            }
          }
          
          // If no thumbnail exists and this is a video URL, generate one
          if (!data.thumbnail_url && platform === 'direct_upload' && isSupabaseStorageUrl(videoUrl)) {
            try {
              setGeneratingThumbnail(true);
              console.log('Generating thumbnail for video in preview modal:', videoUrl, 'Platform:', platform);
              
              generateThumbnailFromUrl(videoUrl)
                .then(thumbnailUrl => {
                  if (thumbnailUrl) {
                    // Update the ad creative with the new thumbnail
                    supabase.from('ad_creatives')
                      .update({ 
                        thumbnail_url: thumbnailUrl,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', creativeId)
                      .then(({ error: updateError }) => {
                        if (updateError) {
                          console.error('Error updating thumbnail:', updateError);
                        } else {
                          console.log('Thumbnail generated and saved successfully');
                          // Refresh ad creatives to show the new thumbnail
                          fetchAdCreatives();
                        }
                        setGeneratingThumbnail(false);
                      });
                  } else {
                    console.log('No thumbnail generated - null result');
                    setGeneratingThumbnail(false);
                  }
                })
                .catch(err => {
                  console.error('Error generating thumbnail in preview modal:', err);
                  setGeneratingThumbnail(false);
                });
            } catch (thumbnailError) {
              console.error('Error generating thumbnail in preview modal:', thumbnailError);
              setGeneratingThumbnail(false);
            }
          } else if (!data.thumbnail_url && platform === 'dropbox') {
            // Dropbox thumbnails cannot be generated due to CORS restrictions
            // The canvas becomes "tainted" and cannot be exported to data URL
            console.log('Dropbox thumbnail generation not supported due to CORS restrictions');
          }
          
          const initialMessages = [
            {
              id: '1',
              type: 'system' as const,
              content: 'You can submit your TikTok auth code (starting with #) or Instagram reel URL here. The system will automatically detect which type you\'re submitting.',
              timestamp: new Date()
            }
          ];
          
          // Add existing submissions to chat history
          if (data.merged_instagram_reel_url) {
            // Filter out any existing Instagram messages first
            const existingInstagramMessage = initialMessages.find(m => m.platform === 'instagram');
            if (!existingInstagramMessage) {
              // Check if this Instagram URL is new (added after last activation)
              const isNewInstagram = data.instagram_url_updated_at && data.last_activated_at 
                ? new Date(data.instagram_url_updated_at) > new Date(data.last_activated_at)
                : false;
              
              initialMessages.push({
                id: 'instagram-' + Date.now(),
                type: 'user' as const,
                content: data.merged_instagram_reel_url,
                timestamp: new Date(Date.now() - 60000), // 1 minute ago 
                platform: 'instagram' as const,
                isNew: isNewInstagram
              });
              
              // If we don't have an Instagram thumbnail yet, try to fetch it
              if (!data.instagram_thumbnail_url && data.merged_instagram_reel_url) {
                try {
                  // Pass the creative ID so the Edge Function can update the database directly
                  fetchInstagramThumbnail(data.merged_instagram_reel_url, creativeId)
                    .then(() => fetchAdCreatives())
                    .catch(err => console.error('Error fetching Instagram thumbnail:', err));
                } catch (thumbnailError) {
                  console.error('Error fetching Instagram thumbnail:', thumbnailError);
                }
              }
            }
          }
          
          if (data.merged_tiktok_auth_code) {
            // Filter out any existing TikTok messages first
            const existingTikTokMessage = initialMessages.find(m => m.platform === 'tiktok');
            if (!existingTikTokMessage) {
              // Check if this TikTok code is new (added after last activation)
              const isNewTikTok = data.tiktok_url_updated_at && data.last_activated_at 
                ? new Date(data.tiktok_url_updated_at) > new Date(data.last_activated_at)
                : false;
              
              initialMessages.push({
                id: 'tiktok-' + Date.now(),
                type: 'user' as const,
                content: data.merged_tiktok_auth_code,
                timestamp: new Date(Date.now() - 120000), // 2 minutes ago
                platform: 'tiktok' as const,
                isNew: isNewTikTok
              });
            }
          }
          
          setMessages(initialMessages);
        } catch (error) {
          console.error('Error fetching creative data:', error);
          setMessages([
            {
              id: 'system-' + Date.now(),
              type: 'system' as const,
              content: 'You can submit your TikTok auth code (starting with #) or Instagram reel URL here. The system will automatically detect which type you\'re submitting.',
              timestamp: new Date()
            }
          ]);
        }
      };
      
      fetchCreativeData();
    }
  }, [isOpen, creativeId, videoUrl, platform, fetchAdCreatives]);

  // Initialize chat with system message
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, creativeId]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const detectInputType = (input: string): 'instagram' | 'tiktok' | 'unknown' => {
    const trimmedInput = input.trim();
    
    if (trimmedInput.startsWith('#')) {
      return 'tiktok';
    }
    
    if (trimmedInput.includes('instagram.com') && 
        (trimmedInput.includes('/reel/') || trimmedInput.includes('/p/'))) {
      return 'instagram';
    }
    
    return 'unknown';
  };

  const validateInput = (input: string, type: 'instagram' | 'tiktok'): boolean => {
    if (type === 'tiktok') {
      return input.startsWith('#') && input.length > 1;
    }
    
    if (type === 'instagram') {
      try {
        const url = new URL(input);
        return url.hostname.includes('instagram.com') && 
               (url.pathname.includes('/reel/') || url.pathname.includes('/p/'));
      } catch {
        return false;
      }
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !creativeId) return;
    
    const trimmedInput = inputValue.trim();
    const inputType = detectInputType(trimmedInput);
    
    if (inputType === 'unknown') {
      setError('Please enter a valid TikTok auth code (starting with #) or Instagram reel URL');
      return;
    }
    
    if (!validateInput(trimmedInput, inputType)) {
      setError(inputType === 'tiktok' 
        ? 'TikTok auth code must start with # and contain additional characters'
        : 'Please enter a valid Instagram reel URL'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: trimmedInput,
        timestamp: new Date(),
        platform: inputType
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Update the ad creative in the database
      const updateData: any = {};
      if (inputType === 'tiktok') {
        // Check if we're replacing an existing code
        const existingTikTokCode = messages.find(m => m.platform === 'tiktok' && m.type === 'user');
        let isReplacement = false;
        let previousContent = '';
       
        if (existingTikTokCode) {
          isReplacement = true;
          previousContent = existingTikTokCode.content;
          // Add replacement message to chat
          const replacementMessage: ChatMessage = {
            id: (Date.now() + 3).toString(),
            type: 'system',
            content: `Replacing previous TikTok auth code: ${existingTikTokCode.content}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, replacementMessage]);
        }
        updateData.merged_tiktok_auth_code = trimmedInput; 
       
       // Notify team about the replacement via WhatsApp
       if (isReplacement && previousContent) {
         try {
           // Get artist info
           const { data: creativeData, error: creativeError } = await supabase
             .from('ad_creatives')
             .select('artists_id, artists!inner(name, whatsapp_group_id)')
             .eq('id', creativeId)
             .single();
           
           if (!creativeError && creativeData) {
             const { artists } = creativeData;
             
             // Send notification asynchronously
             const { WhatsAppService } = await import('../services/whatsapp');
             WhatsAppService.notifyAdCreativeUpdate({
               artistName: artists.name,
               artistId: creativeData.artists_id,
               artistGroupId: artists.whatsapp_group_id,
               platform: 'tiktok',
               content: trimmedInput,
               videoName: videoName,
               status: 'pending',
               isReplacement: true,
               previousContent
             }).catch(console.error);
           }
         } catch (notifyError) {
           console.error('Error sending replacement notification:', notifyError);
         }
       }
      } else {
        // Check if we're replacing an existing URL
        const existingInstagramUrl = messages.find(m => m.platform === 'instagram' && m.type === 'user');
        let isReplacement = false; 
        let previousContent = ''; 
       
        if (existingInstagramUrl) {
          isReplacement = true;
          previousContent = existingInstagramUrl.content;
          // Add replacement message to chat
          const replacementMessage: ChatMessage = {
            id: (Date.now() + 3).toString(),
            type: 'system',
            content: `Replacing previous Instagram URL: ${existingInstagramUrl.content}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, replacementMessage]);
        }
        updateData.merged_instagram_reel_url = trimmedInput;
       
        // Try to fetch Instagram thumbnail
        try {
          console.log('Fetching Instagram thumbnail for new URL:', trimmedInput);
          // Pass the creative ID so the Edge Function can update the database directly
          fetchInstagramThumbnail(trimmedInput, creativeId)
            .then(() => fetchAdCreatives())
            .catch(err => console.error('Error fetching Instagram thumbnail:', err));
        } catch (thumbnailError) {
          console.error('Error fetching Instagram thumbnail:', thumbnailError);
        }
        
       // Notify team about the replacement via WhatsApp
       if (isReplacement && previousContent) {
         try {
           // Get artist info
           const { data: creativeData, error: creativeError } = await supabase
             .from('ad_creatives')
             .select('artists_id, artists!inner(name, whatsapp_group_id)')
             .eq('id', creativeId)
             .single();
           
           if (!creativeError && creativeData) {
             const { artists } = creativeData;
             
             // Send notification asynchronously
             const { WhatsAppService } = await import('../services/whatsapp');
             WhatsAppService.notifyAdCreativeUpdate({
               artistName: artists.name,
               artistId: creativeData.artists_id,
               artistGroupId: artists.whatsapp_group_id,
               platform: 'instagram',
               content: trimmedInput,
               videoName: videoName,
               status: 'pending',
               isReplacement: true,
               previousContent
             }).catch(console.error);
           }
         } catch (notifyError) {
           console.error('Error sending replacement notification:', notifyError);
         }
       }
      }

      const { error: updateError } = await supabase
        .from('ad_creatives')
        .update(updateData)
        .eq('id', creativeId)
        .select();

      if (updateError) throw updateError;

      // Add success message to chat
      const successMessage: ChatMessage = {
        id: (Date.now() + 4).toString(),
        type: 'system',
        content: `✅ ${inputType === 'tiktok' ? 'TikTok auth code' : 'Instagram reel URL'} saved successfully!`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
      setSuccess(`${inputType === 'tiktok' ? 'TikTok auth code' : 'Instagram reel URL'} saved successfully!`);
      setInputValue('');
      
      // Refresh ad creatives data
      fetchAdCreatives().catch(console.error);
      
      // Update the messages list to show only the latest submission for each platform
      setMessages(prev => {
        // Keep system messages and the latest user message for each platform
        const systemMessages = prev.filter(m => m.type === 'system');
        
        // For user messages, keep only the latest for each platform
        const latestTikTok = prev
          .filter(m => m.type === 'user' && m.platform === 'tiktok')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          
        const latestInstagram = prev
          .filter(m => m.type === 'user' && m.platform === 'instagram')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        const userMessages = [latestTikTok, latestInstagram].filter(Boolean);
        
        return [...systemMessages, ...userMessages];
      });
      
    } catch (err) {
      console.error('Error updating ad creative:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 5).toString(),
        type: 'system',
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (!isOpen) return null;

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Video Preview
              </h2>
              {videoName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {videoName}
                </p>
              )}
            </div>
            <motion.button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-6 w-6" />
            </motion.button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Video Section */}
            <div className="flex items-center justify-center p-4 bg-black" style={{ width: '60%' }}>
              {(platform === 'dropbox' || platform === 'direct_upload' || platform === 'instagram') ? (
                <div className="h-full w-full flex items-center justify-center" style={{ aspectRatio: '9/16', maxHeight: '80vh' }}>
                  <VideoPlayer
                    key={videoUrl}
                    url={videoUrl}
                    isDesktop={true}
                  />
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">TikTok Content</h3>
                    <p className="text-gray-300">This is a TikTok auth code, not a direct video URL.</p>
                    <p className="text-gray-300 mt-2">Use the chat section to submit your content.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Section */}
            {creativeId && (
              <div className="flex flex-col border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" style={{ width: '40%' }}>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Submit Content
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Add your TikTok auth code or Instagram reel URL
                  </p>
                </div>

                {/* Chat Messages */}
                <div 
                  ref={chatRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        className={`max-w-[85%] rounded-lg p-3 relative ${
                          message.type === 'user'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        {message.isNew && message.type === 'user' && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-lg flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M12 6v6l4 2"/>
                            </svg>
                            NEW
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          {message.platform === 'instagram' && (
                            <Instagram className="h-4 w-4" />
                          )}
                          {message.platform === 'tiktok' && (
                            <svg 
                              viewBox="0 0 24 24" 
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                          )}
                          <span className="text-xs opacity-75">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      className="mx-4 mb-2 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div 
                      className="mx-4 mb-2 flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <p>{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setError(null);
                        setSuccess(null);
                      }}
                      placeholder="Enter TikTok auth code (#...) or Instagram URL"
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      disabled={isSubmitting}
                    />
                    <motion.button
                      type="submit"
                      disabled={!inputValue.trim() || isSubmitting}
                      className="px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      whileHover={!isSubmitting && inputValue.trim() ? { scale: 1.05 } : {}}
                      whileTap={!isSubmitting && inputValue.trim() ? { scale: 0.95 } : {}}
                    >
                      <Send className="h-4 w-4" />
                    </motion.button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>• TikTok auth codes start with #</p>
                    <p>• Instagram URLs should be reel or post links</p>
                    <p className="mt-1 italic">Note: New submissions will replace existing ones of the same type</p>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {generatingThumbnail ? (
                  <span className="text-sm text-primary-500 dark:text-primary-400 flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating thumbnail...
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {platform}
                    </span>
                  </div>
                )}
              </div>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};