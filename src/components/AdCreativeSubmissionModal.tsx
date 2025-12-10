import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Loader, Instagram } from 'lucide-react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { isSupabaseStorageUrl } from '../utils/video/player';
import { fetchInstagramThumbnail } from '../utils/fetchInstagramThumbnail';
import { Upload, Loader as LoaderIcon, X as XIcon, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VideoUploader } from './VideoUploader';

interface AdCreativeSubmissionModalProps {
  onClose: () => void;
  artistId?: string;
  isOpen?: boolean;
}

export function AdCreativeSubmissionModal({ onClose, artistId, isOpen = true }: AdCreativeSubmissionModalProps) {
  const [selectedArtist, setSelectedArtist] = useState(artistId || '');
  const [selectedRelease, setSelectedRelease] = useState<string>('');
  const [releases, setReleases] = useState<any[]>([]);
  const [socialMediaUrls, setSocialMediaUrls] = useState('');
  const [dropboxUrls, setDropboxUrls] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    remainingTime: number;
    uploadSpeed: number;
    fileSize: string;
  } | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { artists, adCreatives, submissions, fetchAdCreatives } = useStore();

  // Filter out archived artists
  const activeArtists = artists.filter(artist => !artist.archived);

  // Fetch releases for selected artist
  useEffect(() => {
    const fetchReleases = async () => {
      if (!selectedArtist) {
        setReleases([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('releases')
          .select('id, name, release_date, created_at')
          .eq('artist_id', selectedArtist as any)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const releases = (data || []) as any[];
        setReleases(releases);

        // Load saved release from session storage or select default
        const savedReleaseKey = `selected_release_${selectedArtist}`;
        const savedRelease = sessionStorage.getItem(savedReleaseKey);

        if (releases && releases.length > 0) {
          if (savedRelease && releases.find((r: any) => r.id === savedRelease)) {
            // Use saved selection if it exists
            setSelectedRelease(savedRelease);
          } else if (releases.length === 1) {
            // Auto-select if only one release
            setSelectedRelease(releases[0].id);
          } else {
            // Select newest (first in list due to order by created_at desc)
            setSelectedRelease(releases[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching releases:', error);
      }
    };

    fetchReleases();
  }, [selectedArtist]);

  // Count Instagram and TikTok URLs
  const socialMediaLines = socialMediaUrls.split('\n').filter(url => url.trim());
  const instagramCount = socialMediaLines.filter(url => 
    url.includes('instagram.com') && (url.includes('/reel/') || url.includes('/p/'))
  ).length;
  const tiktokCount = socialMediaLines.filter(url => url.trim().startsWith('#')).length;
  const dropboxCount = dropboxUrls.split('\n').filter(url => url.trim()).length + uploadedUrls.length;

  const cleanUrl = (url: string): string => {
    try {
      // For Instagram URLs, remove query parameters but keep case sensitivity
      if (url.includes('instagram.com') || url.includes('instagram.com/reel') || url.includes('instagram.com/p/')) {
        const urlObj = new URL(url);
        // Normalize Instagram URLs to a standard format
        const path = urlObj.pathname;
        
        // Extract the post ID which is the second path segment in /p/{id}/ or /reel/{id}/ format
        // Or third segment in /{username}/reel/{id}/ or /{username}/p/{id}/ format
        let postId = '';
        const pathParts = path.split('/').filter(Boolean);
        
        if (pathParts.length >= 2) {
          if (pathParts[0] === 'reel' || pathParts[0] === 'p') {
            // Format: /reel/{id}/ or /p/{id}/
            postId = pathParts[1];
          } else if (pathParts.length >= 3 && (pathParts[1] === 'reel' || pathParts[1] === 'p')) {
            // Format: /{username}/reel/{id}/ or /{username}/p/{id}/
            postId = pathParts[2];
          }
        }
        
        // If we found a post ID, standardize to /reel/{id} or /p/{id} format
        if (postId) {
          const type = path.includes('/reel/') ? 'reel' : 'p';
          return `${urlObj.origin}/${type}/${postId}`;
        }
        
        // If we couldn't parse it properly, just return the cleaned URL
        return `${urlObj.origin}${path}`;
      }
      // For Dropbox URLs, ensure they're in the correct format
      if (url.includes('dropbox.com')) {
        const urlObj = new URL(url);
        urlObj.searchParams.set('dl', '1');
        return urlObj.toString();
      }
      // For TikTok codes, just trim whitespace and preserve case
      return url.trim();
    } catch {
      // If URL parsing fails, return original trimmed string
      return url.trim();
    }
  };

  const validateUrls = (platform: 'instagram' | 'tiktok' | 'dropbox', urls: string) => {
    const lines = urls.split('\n').filter(url => url.trim());
    const duplicates: string[] = [];
    const invalidFormats: string[] = [];
    
    // Check for duplicates within current submission
    const uniqueUrls = new Set<string>();
    const internalDuplicates: string[] = [];

    for (const url of lines) {
      const cleanedUrl = cleanUrl(url);

      // Check URL format
      if (platform === 'instagram' && 
          !(cleanedUrl.includes('instagram.com/reel') || 
            cleanedUrl.includes('instagram.com/p/') || 
            /instagram\.com\/[^\/]+\/reel\//.test(cleanedUrl) || 
            /instagram\.com\/[^\/]+\/p\//.test(cleanedUrl))) {
        invalidFormats.push(url.trim());
        continue;
      }
      if (platform === 'dropbox') {
        if (!cleanedUrl.includes('dropbox.com') && !isSupabaseStorageUrl(cleanedUrl)) {
          invalidFormats.push(url.trim());
          continue;
        }
        // Validate that it's a proper URL
        try {
          new URL(cleanedUrl);
        } catch {
          invalidFormats.push(url.trim());
          continue;
        }
      }
      if (platform === 'instagram') {
        // Validate that it's a proper URL
        try {
          new URL(cleanedUrl);
        } catch {
          invalidFormats.push(url.trim());
          continue;
        }
      }
      if (platform === 'tiktok' && !cleanedUrl.startsWith('#')) {
        invalidFormats.push(url.trim());
        continue;
      }

      // Check for duplicates in existing ad creatives
      const isDuplicate = adCreatives.some(creative => 
        creative.content === cleanedUrl ||
        (platform === 'instagram' && creative.mergedInstagramReelUrl === cleanedUrl) ||
        (platform === 'tiktok' && creative.mergedTiktokAuthCode === cleanedUrl)
      );

      if (isDuplicate) {
        duplicates.push(url.trim());
        continue;
      }

      // Check for duplicates within current submission
      if (uniqueUrls.has(cleanedUrl)) {
        internalDuplicates.push(url.trim());
      } else {
        uniqueUrls.add(cleanedUrl);
      }
    }

    const errors: string[] = [];
    if (invalidFormats.length > 0) {
      errors.push(`Invalid format for the following URLs:\n${invalidFormats.join('\n')}`);
    }
    if (duplicates.length > 0) {
      errors.push(`The following URLs have already been submitted:\n${duplicates.join('\n')}`);
    }
    if (internalDuplicates.length > 0) {
      errors.push(`Duplicate URLs found in your submission:\n${internalDuplicates.join('\n')}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n\n'));
    }

    return Array.from(uniqueUrls);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    // Calculate total file size
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    setUploadStats({
      remainingTime: 0,
      uploadSpeed: 0,
      fileSize: formatFileSize(totalSize)
    });

    // Process each file sequentially
    const uploadFiles = async () => {
      const newUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const url = await new Promise<string>((resolve, reject) => {
            const uploader = new VideoUploader({
              onStart: () => {
                setUploadProgress(0);
              },
              onProgress: (progress, remainingTime = 0, uploadSpeed = 0) => {
                setUploadProgress(progress);
                setUploadStats(prev => prev ? {
                  ...prev,
                  remainingTime,
                  uploadSpeed
                } : null);
              },
              onUploadComplete: (url) => {
                resolve(url);
              },
              onError: (error) => {
                reject(new Error(error));
              }
            });
            
            uploader.uploadFile(file).catch(reject);
          });
          
          newUrls.push(url);
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          setError(`Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setUploadedUrls(prev => [...prev, ...newUrls]);
      setIsUploading(false);
      setUploadStats(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    uploadFiles().catch(error => {
      console.error('Error in file upload process:', error);
      setIsUploading(false);
      setUploadStats(null);
      setError('Failed to upload files: ' + (error instanceof Error ? error.message : 'Unknown error'));
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 KB/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socialMediaUrls.trim() && !dropboxUrls.trim() && uploadedUrls.length === 0) {
      setError('Please enter at least one URL or code');
      return;
    }

    if (!artistId && !selectedArtist) {
      setError('Please select an artist');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      type AdCreativeInsert = {
        artists_id: string;
        platform: string;
        content: string;
        status: 'pending';
        submission_id?: string | null;
        video_name?: string | null;
        thumbnail_url?: string | null;
        release_id?: string | null;
      };

      // Save selected release to session storage
      if (selectedRelease && selectedArtist) {
        sessionStorage.setItem(`selected_release_${selectedArtist}`, selectedRelease);
      }

      const entries: AdCreativeInsert[] = [];

      // Process Social Media URLs (Instagram and TikTok)
      if (socialMediaUrls.trim()) {
        // Split by line and process each URL
        const lines = socialMediaUrls.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Detect if it's Instagram or TikTok
          if (trimmedLine.startsWith('#')) {
            // TikTok AUTH code
            try {
              const validTiktokUrls = validateUrls('tiktok', trimmedLine);
              entries.push(...validTiktokUrls.map(url => ({
                artists_id: artistId || selectedArtist,
                platform: 'tiktok',
                content: url,
                status: 'pending' as const,
                release_id: selectedRelease || null
              })));
            } catch (err) {
              console.error('Error validating TikTok code:', err);
              throw err;
            }
          } else if (trimmedLine.includes('instagram.com') && 
                    (trimmedLine.includes('/reel/') || trimmedLine.includes('/p/'))) {
            // Instagram URL
            try {
              const validInstagramUrls = validateUrls('instagram', trimmedLine);
              entries.push(...validInstagramUrls.map(url => ({
                artists_id: artistId || selectedArtist,
                platform: 'instagram',
                content: url,
                status: 'pending' as const,
                release_id: selectedRelease || null
              })));
              
              // Try to fetch Instagram thumbnails
              for (const url of validInstagramUrls) {
                try {
                  fetchInstagramThumbnail(url, null).catch(console.error);
                } catch (thumbnailError) {
                  console.error('Error fetching Instagram thumbnail:', thumbnailError);
                }
              }
            } catch (err) {
              console.error('Error validating Instagram URL:', err);
              throw err;
            }
          } else {
            // Unknown format
            throw new Error(`Unrecognized format: "${trimmedLine}". Please enter either Instagram URLs or TikTok AUTH codes (starting with #).`);
          }
        }
      }
      
      // Process Dropbox URLs
      if (dropboxUrls.trim() || uploadedUrls.length > 0) {
        // Combine manually entered Dropbox URLs with uploaded URLs
        const validDropboxUrls = dropboxUrls.trim() ? validateUrls('dropbox', dropboxUrls) : [];
        const validUploadedUrls = uploadedUrls.length > 0 ? validateUrls('dropbox', uploadedUrls.join('\n')) : [];
        const allValidUrls = [...validDropboxUrls, ...validUploadedUrls];
        entries.push(...allValidUrls.map(url => {
          // Determine if this is a direct upload or dropbox URL
          const platform = isSupabaseStorageUrl(url) ? 'direct_upload' : 'dropbox';
          
          // Generate thumbnail for video URLs
          const thumbnailUrl = platform === 'direct_upload' ? thumbnails[url] || null : null;
          
          // Check if this URL matches a submission
          const matchingSubmission = submissions.find(sub => sub.videoUrl === url);
          
          return {
            artists_id: artistId || selectedArtist,
            platform,
            content: url,
            submission_id: matchingSubmission?.id?.toString() || null,
            video_name: matchingSubmission?.projectName || null, 
            status: 'pending' as const,
            thumbnail_url: thumbnailUrl || null,
            release_id: selectedRelease || null
          };
        }));
      }

      if (entries.length === 0) {
        throw new Error('No valid URLs to submit');
      }

      // Create ad creatives by inserting directly to database
      const insertData = entries.map(entry => ({
        artists_id: entry.artists_id,
        platform: entry.platform,
        content: entry.content,
        status: entry.status,
        thumbnail_url: entry.thumbnail_url,
        submission_id: entry.submission_id,
        video_name: entry.video_name,
        release_id: entry.release_id
      }));

      const { error } = await supabase
        .from('ad_creatives')
        .insert(insertData as any)
        .select();

      if (error) throw error;
      
      // Refresh ad creatives to show the new entries
      await fetchAdCreatives();
      
      // Send WhatsApp notification to ad creative group
      try {
        const selectedArtistId = artistId || selectedArtist;
        const artist = artists.find(a => a.id === selectedArtistId);
        
        if (artist) {
          // Count creatives by platform
          const platformCounts = new Map<string, number>();
          entries.forEach(entry => {
            platformCounts.set(entry.platform, (platformCounts.get(entry.platform) || 0) + 1);
          });
          
          const platforms = Array.from(platformCounts.entries()).map(([platform, count]) => ({
            platform,
            count
          }));
          
          // Import WhatsAppService dynamically
          const { WhatsAppService } = await import('../services/whatsapp');
          
          // Send notification
          await WhatsAppService.notifyAdCreativeSubmission({
            artistName: artist.name,
            artistId: selectedArtistId,
            platforms,
            totalCount: entries.length
          });
          
          console.log('✅ WhatsApp notification sent for new ad creative submission');
        }
      } catch (notifyError) {
        console.error('❌ Error sending WhatsApp notification:', notifyError);
        // Don't fail the submission if notification fails
      }
      
      onClose();
    } catch (err) {
      console.error('Error submitting URLs:', err);
      if (err instanceof Error && err.message === 'duplicate_entry') {
        setError('One or more of the URLs you tried to submit already exist in the system. Please check your URLs and remove any duplicates.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to submit URLs');
      }
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        duration: 0.5,
        bounce: 0.3
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20, 
      transition: {
        duration: 0.2
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-5"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Add URLs</h2>
          <motion.button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              className="mb-4 flex items-start gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md whitespace-pre-wrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Artist Selection - Only show if no artistId prop */}
          {!artistId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-1 dark:text-white">
                Artist <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedArtist}
                onChange={(e) => setSelectedArtist(e.target.value)}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              >
                <option value="">Select an artist</option>
                {activeArtists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
            </motion.div>
          )}

          {/* Instagram Reels Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <Instagram className="h-5 w-5 text-white z-10" />
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    className="h-5 w-5 text-white"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium dark:text-white">
                  Instagram & TikTok
                </span>
              </div>
              <div className="flex gap-2">
                {instagramCount > 0 && (
                  <span className="text-xs bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-200 px-2 py-0.5 rounded-full flex items-center">
                    <Instagram className="h-3 w-3 mr-1" />
                    {instagramCount}
                  </span>
                )}
                {tiktokCount > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-2 py-0.5 rounded-full flex items-center">
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      className="h-3 w-3 mr-1"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    {tiktokCount}
                  </span>
                )}
              </div>
            </div>
            
            {/* Release Selection Dropdown */}
            {releases.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Release
                </label>
                <select
                  value={selectedRelease}
                  onChange={(e) => setSelectedRelease(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {releases.map((release: any) => {
                    const releaseDate = new Date(release.release_date);
                    const formattedDate = `${releaseDate.getDate()}.${releaseDate.getMonth() + 1}.${releaseDate.getFullYear()}`;
                    return (
                      <option key={release.id} value={release.id}>
                        {release.name} ({formattedDate})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <textarea
              value={socialMediaUrls}
              onChange={(e) => setSocialMediaUrls(e.target.value)}
              placeholder="Enter Instagram Reel URLs or TikTok AUTH Codes (one per line)"
              className="w-full h-32 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <p>Example: https://www.instagram.com/reel/...</p>
              <p>Example: #7253947593475934...</p>
            </div>
          </motion.div>

          {/* Dropbox Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 528 512"
                  className="h-5 w-5 text-white dark:text-white"
                >
                  <path fill="currentColor" d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z"/>
                </svg>
                <span className="text-sm font-medium dark:text-white">
                  Dropbox Video URLs
                </span>
              </div>
              {dropboxCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 px-2 py-0.5 rounded-full flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 528 512"
                    className="h-3 w-3 mr-1"
                  >
                    <path fill="currentColor" d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z"/>
                  </svg>
                  {dropboxUrls.split('\n').filter(url => url.trim()).length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={dropboxUrls}
                onChange={(e) => setDropboxUrls(e.target.value)}
                placeholder="Enter Dropbox video URLs (one per line) or upload files directly"
                className="w-full h-32 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                disabled={loading || isUploading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter Dropbox URLs: https://www.dropbox.com/s/...
              </p>
            </div>
          </motion.div>

          {/* Direct Video Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-white dark:text-white" />
                <span className="text-sm font-medium dark:text-white">
                  Direct Video Upload
                </span>
              </div>
              {uploadedUrls.length > 0 && (
                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200 px-2 py-0.5 rounded-full flex items-center">
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadedUrls.length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={handleFileSelect}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 w-full ${
                    isUploading || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  disabled={isUploading || loading}
                  whileHover={!isUploading && !loading ? { scale: 1.02 } : {}}
                  whileTap={!isUploading && !loading ? { scale: 0.98 } : {}}
                >
                  {isUploading ? (
                    <>
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      <div className="flex flex-col items-center">
                        <span>Uploading... {Math.round(uploadProgress)}%</span>
                        {uploadStats && (
                          <div className="text-xs text-gray-500 mt-1">
                            <div>{uploadStats.fileSize}</div>
                            {uploadStats.remainingTime > 0 && (
                              <div>{formatTime(uploadStats.remainingTime)} remaining</div>
                            )}
                            {uploadStats.uploadSpeed > 0 && (
                              <div>{formatSpeed(uploadStats.uploadSpeed)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Select video files to upload</span>
                    </>
                  )}
                </motion.button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
              </div>
              {uploadedUrls.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Uploaded videos:</p>
                  <div className="max-h-32 overflow-y-auto">
                    {uploadedUrls.map((url, index) => {
                      const hasThumbnail = thumbnails[url] !== undefined;
                      return (
                        <div 
                          key={index} 
                          className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between py-1 group relative"
                          onMouseEnter={() => setHoveredUrl(url)}
                          onMouseLeave={() => setHoveredUrl(null)}
                        >
                          <span className="truncate flex-1 flex items-center">
                            {hasThumbnail && (
                              <Image className="h-3 w-3 mr-1 text-green-500" />
                            )}
                            {url}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedUrls(prev => prev.filter((_, i) => i !== index));
                              // Also remove thumbnail if exists
                              if (thumbnails[url]) {
                                setThumbnails(prev => {
                                  const newThumbnails = {...prev};
                                  delete newThumbnails[url];
                                  return newThumbnails;
                                });
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove file"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                          
                          {/* Thumbnail preview on hover */}
                          {hoveredUrl === url && thumbnails[url] && (
                            <div className="absolute right-0 bottom-full mb-2 z-10">
                              <div className="bg-gray-900 rounded-md p-1 shadow-lg">
                                <img 
                                  src={thumbnails[url]} 
                                  alt="Thumbnail" 
                                  className="w-24 h-auto rounded"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          <motion.div 
            className="flex justify-end space-x-2 pt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <motion.button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading ? { scale: 1.05 } : {}}
              whileTap={!loading ? { scale: 0.95 } : {}}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : (
                'Submit URLs'
              )}
            </motion.button>
          </motion.div>
        </form>
        
        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
          multiple
        />
      </motion.div>
    </div>
  );
}