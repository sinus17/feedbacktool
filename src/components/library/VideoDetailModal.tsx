import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Trash2, Calendar, User, Tag, Plus, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LibraryVideo } from '../../types';
import { VideoPlayer } from '../VideoPlayer';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-5 w-5">
    <path d="M320 128C189.7 128 81.1 213.9 38.1 336C81.1 458.1 189.7 544 320 544C450.3 544 558.9 458.1 601.9 336C558.9 213.9 450.3 128 320 128zM320 464C258.1 464 208 413.9 208 352C208 290.1 258.1 240 320 240C381.9 240 432 290.1 432 352C432 413.9 381.9 464 320 464zM320 288C284.7 288 256 316.7 256 352C256 387.3 284.7 416 320 416C355.3 416 384 387.3 384 352C384 316.7 355.3 288 320 288z"/>
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-5 w-5">
    <path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/>
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-5 w-5">
    <path d="M576 304C576 436.5 461.4 544 320 544C282.9 544 247.7 536.6 215.9 523.3L97.5 574.1C88.1 578.1 77.3 575.8 70.4 568.3C63.5 560.8 62 549.8 66.8 540.8L115.6 448.6C83.2 408.3 64 358.3 64 304C64 171.5 178.6 64 320 64C461.4 64 576 171.5 576 304z"/>
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-5 w-5">
    <path d="M371.8 82.4C359.8 87.4 352 99 352 112L352 192L240 192C142.8 192 64 270.8 64 368C64 481.3 145.5 531.9 164.2 542.1C166.7 543.5 169.5 544 172.3 544C183.2 544 192 535.1 192 524.3C192 516.8 187.7 509.9 182.2 504.8C172.8 496 160 478.4 160 448.1C160 395.1 203 352.1 256 352.1L352 352.1L352 432.1C352 445 359.8 456.7 371.8 461.7C383.8 466.7 397.5 463.9 406.7 454.8L566.7 294.8C579.2 282.3 579.2 262 566.7 249.5L406.7 89.5C397.5 80.3 383.8 77.6 371.8 82.6z"/>
  </svg>
);

const BookmarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-5 w-5">
    <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"/>
  </svg>
);

interface VideoDetailModalProps {
  video: LibraryVideo;
  isOpen?: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  canEdit?: boolean;
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({ video: initialVideo, isOpen = true, onClose, onUpdate, canEdit = false }) => {
  const [video, setVideo] = useState(initialVideo);
  const [editedVideo, setEditedVideo] = useState(initialVideo);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState((initialVideo as any).gemini_analysis || null);
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [showCustomGenreInput, setShowCustomGenreInput] = useState(false);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'stats' | 'analysis'>('details');
  const [analysisLanguage, setAnalysisLanguage] = useState<'en' | 'de'>('de');
  const [isTranslating, setIsTranslating] = useState(false);
  const [englishAnalysis, setEnglishAnalysis] = useState((initialVideo as any).gemini_analysis_en || null);
  const [editType, setEditType] = useState<'song-specific' | 'off-topic'>('song-specific');
  const [editActor, setEditActor] = useState<'solo' | 'multiple'>('solo');
  const [linkCopied, setLinkCopied] = useState(false);
  const predefinedGenres = ['Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Jazz', 'Classical'];
  const categoryOptions = ['Performance', 'Entertainment', 'Relatable', 'Personal'];

  useEffect(() => {
    // Load custom genres from database
    const loadCustomGenres = async () => {
      const { data } = await supabase
        .from('custom_genres')
        .select('name')
        .order('name');
      if (data) {
        setCustomGenres(data.map((g: any) => g.name));
      }
    };
    loadCustomGenres();
  }, []);

  // Update state when modal opens with new video and check for analysis
  useEffect(() => {
    const loadVideoData = async () => {
      setVideo(initialVideo);
      setGeminiAnalysis((initialVideo as any).gemini_analysis || null);
      setEnglishAnalysis((initialVideo as any).gemini_analysis_en || null);
      
      // If modal just opened and no analysis in initialVideo, check database
      if (isOpen && !(initialVideo as any).gemini_analysis) {
        const isTrendingVideo = (initialVideo as any).isTrending === true;
        const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
        const idField = isTrendingVideo ? 'video_id' : 'id';
        
        const { data } = await supabase
          .from(tableName)
          .select('gemini_analysis, gemini_analysis_en')
          .eq(idField as any, initialVideo.id as any)
          .single();
        
        if (data && (data as any).gemini_analysis) {
          setGeminiAnalysis((data as any).gemini_analysis);
          setEnglishAnalysis((data as any).gemini_analysis_en || null);
        }
      }
    };
    
    loadVideoData();
  }, [initialVideo, isOpen, canEdit]);

  useEffect(() => {
    setEditedVideo(video);
    // Initialize edit states from video data
    if (video.genre) {
      const genres = Array.isArray(video.genre) ? video.genre.filter((g: string) => !g.startsWith('[')) : [];
      setEditGenres(genres);
    } else {
      setEditGenres([]);
    }
    if (video.category) {
      const categories = Array.isArray(video.category) ? video.category.filter((c: string) => !c.startsWith('[')) : [];
      setEditCategories(categories);
    } else {
      setEditCategories([]);
    }
    if (video.type) {
      setEditType(video.type);
    }
    if (video.actor) {
      setEditActor(video.actor);
    }
  }, [video]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const toggleGenre = (genre: string) => {
    if (editGenres.includes(genre)) {
      setEditGenres(editGenres.filter(g => g !== genre));
    } else {
      setEditGenres([...editGenres, genre]);
    }
  };

  const addCustomGenre = async () => {
    const trimmedGenre = customGenreInput.trim();
    if (!trimmedGenre) return;
    
    // Don't add if already selected for this video
    if (editGenres.includes(trimmedGenre)) {
      setCustomGenreInput('');
      setShowCustomGenreInput(false);
      return;
    }
    
    // If it's not in predefined or custom genres, save it to database
    if (!predefinedGenres.includes(trimmedGenre) && !customGenres.includes(trimmedGenre)) {
      try {
        await supabase
          .from('custom_genres')
          .insert({ name: trimmedGenre } as any)
          .select();
        
        // Update local state
        setCustomGenres([...customGenres, trimmedGenre].sort());
      } catch (error) {
        console.error('Error saving custom genre:', error);
        // Continue anyway - it might already exist
      }
    }
    
    // Add to this video's genres
    setEditGenres([...editGenres, trimmedGenre]);
    setCustomGenreInput('');
    setShowCustomGenreInput(false);
  };

  const toggleCategory = (category: string) => {
    if (editCategories.includes(category)) {
      setEditCategories(editCategories.filter(c => c !== category));
    } else {
      setEditCategories([...editCategories, category]);
    }
  };


  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('video_library')
        .update({
          genre: editGenres.length > 0 ? editGenres : null,
          category: editCategories.length > 0 ? editCategories : null,
          type: editType,
          actor: editActor,
          tags: editedVideo.tags || null,
          content_description: editedVideo.contentDescription || null,
          why_it_works: editedVideo.whyItWorks || null,
          artist_recommendation: editedVideo.artistRecommendation || null,
        } as any)
        .eq('id' as any, video.id as any);

      if (error) throw error;

      // Reload the video data to update the modal
      const { data: updatedVideo } = await supabase
        .from('video_library')
        .select('*')
        .eq('id' as any, video.id as any)
        .single();

      if (updatedVideo) {
        // Update the video prop with fresh data from DB
        Object.assign(video, {
          genre: (updatedVideo as any).genre,
          category: (updatedVideo as any).category,
          type: (updatedVideo as any).type,
          actor: (updatedVideo as any).actor,
          tags: (updatedVideo as any).tags,
          contentDescription: (updatedVideo as any).content_description,
          whyItWorks: (updatedVideo as any).why_it_works,
          artistRecommendation: (updatedVideo as any).artist_recommendation,
        });
      }

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslate = async () => {
    if (isTranslating) return;
    
    setIsTranslating(true);
    try {
      const response = await supabase.functions.invoke('translate-gemini-analysis', {
        body: { videoId: video.id, targetLang: 'en' }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Translation failed');
      }

      if (response.data?.translation) {
        setEnglishAnalysis(response.data.translation);
        // Also update the video object
        (video as any).gemini_analysis_en = response.data.translation;
      }
    } catch (error) {
      console.error('Translation error:', error);
      alert('Failed to translate analysis. Please try again.');
      setAnalysisLanguage('de'); // Switch back to German on error
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'de') => {
    setAnalysisLanguage(lang);
    
    // Only trigger translation if switching to English and no translation exists
    if (lang === 'en' && !englishAnalysis && !(video as any).gemini_analysis_en && geminiAnalysis) {
      await handleTranslate();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const isTrendingVideo = (video as any).isTrending === true;
      const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
      const idField = isTrendingVideo ? 'video_id' : 'id';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idField as any, video.id as any);

      if (error) throw error;

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const handleMoveToLibrary = async () => {
    if (!confirm('Move this trending video to your regular library?')) {
      return;
    }

    setIsMoving(true);
    try {
      // Get the full record from recommendations table
      // @ts-ignore - Cross-table query with different schemas
      const { data: trendingVideo, error: fetchError } = await supabase
        .from('video_library_recommendations')
        .select('*')
        // @ts-expect-error - video_id field exists in recommendations table but not in type definition
        .eq('video_id' as any, video.id)
        .single();

      if (fetchError || !trendingVideo) {
        throw new Error('Failed to fetch trending video data');
      }

      // Cast to any to bypass TypeScript strict checking for cross-table migration
      const videoData = trendingVideo as any;

      // Insert into video_library table - copy ALL fields
      // @ts-ignore - Cross-table insert with different schemas
      const { error: insertError } = await supabase
        .from('video_library')
        .insert({
          // Basic info
          platform: videoData.platform,
          source_url: videoData.source_url,
          video_id: videoData.video_id,
          account_username: videoData.account_username,
          account_name: videoData.account_name,
          title: videoData.title,
          description: videoData.description,
          upload_date: videoData.upload_date,
          duration: videoData.duration,
          
          // Stats
          views_count: videoData.views_count,
          likes_count: videoData.likes_count,
          comments_count: videoData.comments_count,
          shares_count: videoData.shares_count,
          collect_count: videoData.collect_count,
          
          // Media URLs
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          thumbnail_storage_url: videoData.thumbnail_storage_url,
          
          // Creator info
          follower_count: videoData.follower_count,
          creator_avatar_url: videoData.creator_avatar_url,
          creator_avatar_storage_url: videoData.creator_avatar_storage_url,
          author_verified: videoData.author_verified,
          
          // Music info
          music_title: videoData.music_title,
          music_author: videoData.music_author,
          is_original_sound: videoData.is_original_sound,
          music_cover_thumb: videoData.music_cover_thumb,
          music_video_count: videoData.music_video_count,
          
          // Location
          location_name: videoData.location_name,
          location_city: videoData.location_city,
          location_country: videoData.location_country,
          location_address: videoData.location_address,
          
          // Categories & Tags
          genre: videoData.genre ? [videoData.genre] : [],
          category: videoData.category ? [videoData.category] : [],
          tags: videoData.tags || [],
          hashtags: videoData.hashtags || [],
          type: videoData.type,
          actor: videoData.actor,
          diversification_labels: videoData.diversification_labels || [],
          suggested_words: videoData.suggested_words || [],
          
          // Photo post data
          is_photo_post: videoData.is_photo_post || false,
          image_urls: videoData.image_urls || null,
          
          // AI Analysis
          content_description: videoData.content_description,
          why_it_works: videoData.why_it_works,
          artist_recommendation: videoData.artist_recommendation,
          gemini_analysis: videoData.gemini_analysis,
          gemini_analysis_en: videoData.gemini_analysis_en,
          gemini_analyzed_at: videoData.gemini_analyzed_at,
          
          // Processing
          processing_status: videoData.processing_status,
          processing_error: videoData.processing_error,
          
          // Raw data
          raw_api_data: videoData.raw_api_data,
          
          // Publishing
          is_published: true, // Publish immediately when moving from trending
          featured: videoData.featured || false,
          is_adaptable: true, // Mark as adaptable since it came from trending
          
          // User tracking
          created_by: videoData.created_by,
        } as any);

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Video inserted into library, now verifying...');

      // VERIFY: Read back the inserted record to ensure all data was copied
      const { data: verifyData, error: verifyError } = await supabase
        .from('video_library')
        .select('*')
        .eq('video_id', videoData.video_id)
        .single();

      if (verifyError || !verifyData) {
        throw new Error('Verification failed: Could not read back inserted video');
      }

      // Check critical fields
      const criticalFields = [
        'platform', 'source_url', 'video_id', 'account_username', 'account_name',
        'is_photo_post', 'thumbnail_storage_url', 'processing_status'
      ];

      const missingFields: string[] = [];
      for (const field of criticalFields) {
        const sourceValue = videoData[field];
        const targetValue = (verifyData as any)[field];
        
        // Only check if source has a value
        if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
          if (targetValue === null || targetValue === undefined || targetValue === '') {
            missingFields.push(field);
          }
        }
      }

      if (missingFields.length > 0) {
        console.error('❌ Verification failed! Missing fields:', missingFields);
        throw new Error(`Data verification failed. Missing fields: ${missingFields.join(', ')}`);
      }

      // Verify photo post data
      if (videoData.is_photo_post && videoData.image_urls) {
        if (!(verifyData as any).is_photo_post || !(verifyData as any).image_urls) {
          throw new Error('Photo post data not copied correctly');
        }
      }

      console.log('✅ Verification passed! All critical data copied correctly.');
      console.log('Source record:', videoData);
      console.log('Target record:', verifyData);

      // Only NOW delete from recommendations table after verification passed
      // @ts-ignore - Cross-table delete
      const { error: deleteError } = await supabase
        .from('video_library_recommendations')
        .delete()
        // @ts-expect-error - video_id field exists in recommendations table but not in type definition
        .eq('video_id' as any, video.id);

      if (deleteError) {
        console.error('❌ Delete failed:', deleteError);
        throw new Error('Failed to delete from recommendations after successful copy');
      }

      console.log('✅ Successfully deleted from recommendations');
      alert('✅ Video moved to library successfully! All data verified.');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error moving video to library:', error);
      alert('Failed to move video to library');
    } finally {
      setIsMoving(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    // Always use trending analysis (analyze-trending-gemini) for music adaptation scoring
    const edgeFunctionName = 'analyze-trending-gemini';
    const tableName = 'video_library';
    const idField = 'id';
    
    console.log(`Starting trending analysis for music adaptation:`, video.id);
    
    try {
      // Set a timeout of 2 minutes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timed out after 2 minutes')), 120000)
      );

      const analysisPromise = supabase.functions.invoke(edgeFunctionName, {
        body: { videoId: video.id }
      });

      const response = await Promise.race([analysisPromise, timeoutPromise]) as any;

      if (response.error) {
        console.error('Gemini API error:', response.error);
        throw new Error(response.error.message || 'Failed to analyze video');
      }

      console.log('✅ Gemini Analysis Complete:', response.data?.analysis);

      // Reload the video data to show updated analysis
      const { data: updatedVideo } = await supabase
        .from(tableName)
        .select('*')
        .eq(idField as any, video.id as any)
        .single();

      if (updatedVideo) {
        // Update the edited video state with new analysis
        setEditedVideo({
          ...editedVideo,
          contentDescription: (updatedVideo as any).content_description,
          whyItWorks: (updatedVideo as any).why_it_works,
          artistRecommendation: (updatedVideo as any).artist_recommendation,
        });
        
        // Update the gemini analysis state to trigger re-render
        setGeminiAnalysis((updatedVideo as any).gemini_analysis);
        
        // Update the video state with new data including is_adaptable and music_adaptation_score
        setVideo({
          ...video,
          ...(updatedVideo as any)
        });
      }

      // Trigger parent update
      onUpdate?.();
    } catch (error: any) {
      console.error('❌ Error analyzing video:', error);
      alert('Failed to analyze video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[#121313] rounded-lg w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-[#121313] border-b border-gray-700 p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Video Details</h2>
            {!canEdit && (video as any).music_adaptation_score !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#202a82]/20 border border-[#202a82]/40 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" style={{ color: '#202a82' }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="text-sm font-semibold" style={{ color: '#202a82' }}>
                  {(video as any).music_adaptation_score}/10
                </span>
                <span className="text-xs text-gray-400">Adaptation Score</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50"
                  title="Analyze for Music Adaptation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
                  </svg>
                </button>
                {(video as any).isTrending && (
                  <button
                    onClick={handleMoveToLibrary}
                    disabled={isMoving}
                    className="p-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors disabled:opacity-50"
                    title="Move to Library"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M5 12h14"></path>
                      <path d="M12 5v14"></path>
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
                  title="Delete Video"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </>
            )}
            {canEdit && isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedVideo(video);
                  }}
                  disabled={isSaving}
                  className="px-3 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Video Player */}
            <div className="space-y-4">
              <div className="relative mx-auto" style={{ aspectRatio: '9/16', maxHeight: '80vh' }}>
                {video.isPhotoPost && video.imageUrls && video.imageUrls.length > 0 ? (
                  <VideoPlayer 
                    url={video.videoUrl || ''} 
                    isDesktop={true} 
                    isPhotoPost={true}
                    imageUrls={video.imageUrls}
                  />
                ) : video.videoUrl ? (
                  <VideoPlayer url={video.videoUrl} isDesktop={true} />
                ) : (
                  <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[70vh] mx-auto flex items-center justify-center text-gray-500">
                    Video not available
                  </div>
                )}
                
                {/* Scanning Animation Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-[5]">
                  <div className="relative w-full h-full overflow-hidden">
                    {/* Animated Laser Beam */}
                    <div className="absolute inset-0">
                      <div className="absolute w-full h-1 bg-gradient-to-r from-transparent to-transparent shadow-[0_0_20px_rgba(32,42,130,0.8)]" 
                           style={{ 
                             animation: 'scan 2s ease-in-out infinite',
                             background: 'linear-gradient(to right, transparent, #202a82, transparent)'
                           }}>
                      </div>
                    </div>
                    
                    {/* Scanning Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-12 w-12 mb-4 animate-pulse" style={{ color: '#202a82' }}>
                        <path d="M423.5 117.2C419 118.9 416 123.2 416 128C416 132.8 419 137.1 423.5 138.8L480 160L501.2 216.5C502.9 221 507.2 224 512 224C516.8 224 521.1 221 522.8 216.5L544 160L600.5 138.8C605 137.1 608 132.8 608 128C608 123.2 605 118.9 600.5 117.2L544 96L522.8 39.5C521.1 35 516.8 32 512 32C507.2 32 502.9 35 501.2 39.5L480 96L423.5 117.2zM238.5 137.3C235.9 131.6 230.2 128 224 128C217.8 128 212.1 131.6 209.5 137.3L156.4 252.3L41.4 305.4C35.6 308.1 32 313.8 32 320C32 326.2 35.6 331.9 41.3 334.5L156.3 387.6L209.4 502.6C212 508.3 217.7 511.9 223.9 511.9C230.1 511.9 235.8 508.3 238.4 502.6L291.5 387.6L406.5 334.5C412.2 331.9 415.8 326.2 415.8 320C415.8 313.8 412.2 308.1 406.5 305.5L291.5 252.4L238.4 137.4zM448 480L391.5 501.2C387 502.9 384 507.2 384 512C384 516.8 387 521.1 391.5 522.8L448 544L469.2 600.5C470.9 605 475.2 608 480 608C484.8 608 489.1 605 490.8 600.5L512 544L568.5 522.8C573 521.1 576 516.8 576 512C576 507.2 573 502.9 568.5 501.2L512 480L490.8 423.5C489.1 419 484.8 416 480 416C475.2 416 470.9 419 469.2 423.5L448 480z"/>
                      </svg>
                      <p className="text-lg font-semibold mb-2">Analyzing Video with Gemini AI</p>
                      <p className="text-sm text-gray-300">Scanning content, visuals, and engagement factors...</p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'details'
                      ? 'text-white border-b-2 border-primary-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'analysis'
                      ? 'text-white border-b-2 border-primary-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Analysis
                </button>
              </div>

              {/* Tab Content: Details */}
              {activeTab === 'details' && (
                <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 flex-wrap">
                    <User className="h-4 w-4" />
                    <span className="text-sm">
                      {video.accountName && `${video.accountName} • `}
                      @{video.accountUsername}
                      {video.followerCount != null && video.followerCount > 0 && ` • ${(video.followerCount / 1000).toFixed(1)}K followers`}
                    </span>
                    {(video as any).is_adaptable === true && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-md border border-yellow-500/40">
                        ⚡ Adaptable
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/library?tab=feed&public=true&video=${video.id}`;
                        navigator.clipboard.writeText(shareUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        linkCopied 
                          ? 'bg-green-600 text-white' 
                          : 'bg-dark-700 text-white hover:bg-dark-600'
                      }`}
                      title={linkCopied ? 'Link copied!' : 'Copy share link'}
                    >
                      {linkCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      )}
                    </button>
                    <a
                      href={video.videoUrl}
                      download
                      className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                      title="Download Video"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" x2="12" y1="15" y2="3"></line>
                      </svg>
                    </a>
                    <a
                      href={video.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
                      title="View original on TikTok"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h10v10"></path>
                        <path d="M7 17 17 7"></path>
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {video.uploadDate && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{formatDate(video.uploadDate)}</span>
                    </div>
                  )}
                  {video.id && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="text-sm font-mono text-xs">ID: {video.id}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className={`grid ${video.platform === 'instagram' ? 'grid-cols-3' : 'grid-cols-5'} gap-4 p-4 bg-dark-700 rounded-lg`}>
                  <div className="text-center">
                    <div className="mx-auto mb-1 text-gray-400 flex justify-center">
                      <EyeIcon />
                    </div>
                    <p className="text-sm font-semibold text-white">{formatNumber(video.viewsCount)}</p>
                    <p className="text-xs text-gray-400">Views</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-1 text-gray-400 flex justify-center">
                      <HeartIcon />
                    </div>
                    <p className="text-sm font-semibold text-white">{formatNumber(video.likesCount)}</p>
                    <p className="text-xs text-gray-400">Likes</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-1 text-gray-400 flex justify-center">
                      <CommentIcon />
                    </div>
                    <p className="text-sm font-semibold text-white">{formatNumber(video.commentsCount)}</p>
                    <p className="text-xs text-gray-400">Comments</p>
                  </div>
                  {video.platform === 'tiktok' && (
                    <>
                      <div className="text-center">
                        <div className="mx-auto mb-1 text-gray-400 flex justify-center">
                          <ShareIcon />
                        </div>
                        <p className="text-sm font-semibold text-white">{formatNumber(video.sharesCount)}</p>
                        <p className="text-xs text-gray-400">Shares</p>
                      </div>
                      <div className="text-center">
                        <div className="mx-auto mb-1 text-gray-400 flex justify-center">
                          <BookmarkIcon />
                        </div>
                        <p className="text-sm font-semibold text-white">{formatNumber(video.collectCount)}</p>
                        <p className="text-xs text-gray-400">Saves</p>
                      </div>
                    </>
                  )}
                </div>

                {video.title && (
                  <h3 className="text-lg font-semibold text-white">{video.title}</h3>
                )}

                {video.description && (
                  <p className="text-sm text-gray-300">{video.description}</p>
                )}
              </div>

              {/* Music/Sound */}
              {video.platform === 'tiktok' && (video.musicTitle || video.isOriginalSound) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    Sound
                  </h4>
                  <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                    {video.musicCoverThumb && (
                      <img 
                        src={video.musicCoverThumb} 
                        alt={video.musicTitle || 'Sound cover'} 
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{video.musicTitle || 'Unknown Sound'}</p>
                      {video.musicAuthor && (
                        <p className="text-xs text-gray-400">{video.musicAuthor}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {video.isOriginalSound ? (
                          <span className="inline-block px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
                            Original Sound
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                            Official Sound
                          </span>
                        )}
                        {video.musicVideoCount && video.musicVideoCount > 0 && (
                          <span className="text-xs text-gray-400">
                            {video.musicVideoCount.toLocaleString()} videos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Categorization */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categorization
                </h4>
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Genres */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Genres (Optional)</label>
                      <div className="flex flex-wrap gap-2">
                        {[...predefinedGenres, ...customGenres].map((genre) => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                              editGenres.includes(genre)
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                            }`}
                          >
                            {editGenres.includes(genre) && <Check className="h-3 w-3" />}
                            {genre}
                          </button>
                        ))}
                        {!showCustomGenreInput ? (
                          <button
                            type="button"
                            onClick={() => setShowCustomGenreInput(true)}
                            className="px-3 py-1 text-xs bg-primary-500/50 text-primary-300 rounded-full hover:bg-primary-500/70 transition-colors flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={customGenreInput}
                              onChange={(e) => setCustomGenreInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustomGenre();
                                } else if (e.key === 'Escape') {
                                  setShowCustomGenreInput(false);
                                  setCustomGenreInput('');
                                }
                              }}
                              placeholder="Custom genre"
                              autoFocus
                              className="px-3 py-1 text-xs bg-dark-700 border border-primary-500 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 w-32"
                            />
                            <button
                              type="button"
                              onClick={addCustomGenre}
                              disabled={!customGenreInput.trim()}
                              className="text-primary-500 hover:text-primary-400 transition-colors disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomGenreInput(false);
                                setCustomGenreInput('');
                              }}
                              className="text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Categories (Optional)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryOptions.map((cat) => (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editCategories.includes(cat)}
                              onChange={() => toggleCategory(cat)}
                              className="w-4 h-4 text-primary-500 bg-dark-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <span className="text-gray-300">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type *</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="song-specific"
                            checked={editType === 'song-specific'}
                            onChange={(e) => setEditType(e.target.value as 'song-specific')}
                            className="text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Song-Specific</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="off-topic"
                            checked={editType === 'off-topic'}
                            onChange={(e) => setEditType(e.target.value as 'off-topic')}
                            className="text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Off-Topic</span>
                        </label>
                      </div>
                    </div>

                    {/* Actor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Actor *</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="solo"
                            checked={editActor === 'solo'}
                            onChange={(e) => setEditActor(e.target.value as 'solo')}
                            className="text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Solo</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="multiple"
                            checked={editActor === 'multiple'}
                            onChange={(e) => setEditActor(e.target.value as 'multiple')}
                            className="text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-gray-300">Multiple</span>
                        </label>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Genres */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Genres</h5>
                      {(() => {
                        const genres = Array.isArray(video.genre) ? video.genre : [];
                        return genres.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {genres.map((g: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm">
                                {g}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not set</p>
                        );
                      })()}
                    </div>

                    {/* Categories */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Categories</h5>
                      {(() => {
                        const categories = Array.isArray(video.category) ? video.category : [];
                        return categories.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {categories.map((c: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not set</p>
                        );
                      })()}
                    </div>

                    {/* Type */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Type</h5>
                      {video.type ? (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm inline-block">
                          {video.type === 'song-specific' ? 'Song-Specific' : 'Off-Topic'}
                        </span>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Not set</p>
                      )}
                    </div>

                    {/* Actor */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Actor</h5>
                      {video.actor ? (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm inline-block">
                          {video.actor === 'solo' ? 'Solo' : 'Multiple'}
                        </span>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Not set</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* TikTok Algorithm Metadata */}
              {video.platform === 'tiktok' && (video.diversification_labels || video.location_name || video.suggested_words !== undefined) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    TikTok Algorithm Data
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                        {/* Algorithmic Category */}
                        {video.diversification_labels && Array.isArray(video.diversification_labels) && video.diversification_labels.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-500 mb-2">Algorithmic Category</h6>
                            <div className="flex flex-wrap gap-2">
                              {video.diversification_labels.map((label: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload Location */}
                        {video.location_name && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-500 mb-2">Upload Location</h6>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm inline-block">
                              {video.location_name}
                            </span>
                          </div>
                        )}

                        {/* SEO Indexation */}
                        {video.suggested_words !== undefined && (
                          <div className="col-span-2">
                            <h6 className="text-xs font-medium text-gray-500 mb-2">SEO Indexation</h6>
                            {Array.isArray(video.suggested_words) && video.suggested_words.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {video.suggested_words.map((word: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                                    {word}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">No keywords</p>
                            )}
                          </div>
                        )}
                  </div>
                </div>
              )}
                </div>
              )}

              {/* Tab Content: Analysis */}
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {geminiAnalysis ? (
                    <>
                      <div className="space-y-4 p-4 bg-[#222d8c]/10 border border-[#3b81f6]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[#3b81f6] flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-4 w-4">
                              <path d="M423.5 117.2C419 118.9 416 123.2 416 128C416 132.8 419 137.1 423.5 138.8L480 160L501.2 216.5C502.9 221 507.2 224 512 224C516.8 224 521.1 221 522.8 216.5L544 160L600.5 138.8C605 137.1 608 132.8 608 128C608 123.2 605 118.9 600.5 117.2L544 96L522.8 39.5C521.1 35 516.8 32 512 32C507.2 32 502.9 35 501.2 39.5L480 96L423.5 117.2zM238.5 137.3C235.9 131.6 230.2 128 224 128C217.8 128 212.1 131.6 209.5 137.3L156.4 252.3L41.4 305.4C35.6 308.1 32 313.8 32 320C32 326.2 35.6 331.9 41.3 334.5L156.3 387.6L209.4 502.6C212 508.3 217.7 511.9 223.9 511.9C230.1 511.9 235.8 508.3 238.4 502.6L291.5 387.6L406.5 334.5C412.2 331.9 415.8 326.2 415.8 320C415.8 313.8 412.2 308.1 406.5 305.5L291.5 252.4L238.4 137.4zM448 480L391.5 501.2C387 502.9 384 507.2 384 512C384 516.8 387 521.1 391.5 522.8L448 544L469.2 600.5C470.9 605 475.2 608 480 608C484.8 608 489.1 605 490.8 600.5L512 544L568.5 522.8C573 521.1 576 516.8 576 512C576 507.2 573 502.9 568.5 501.2L512 480L490.8 423.5C489.1 419 484.8 416 480 416C475.2 416 470.9 419 469.2 423.5L448 480z"/>
                            </svg>
                            Gemini AI Analysis
                          </h4>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1">
                              <button
                                onClick={() => handleLanguageChange('de')}
                                disabled={isTranslating}
                                className={`px-3 py-1.5 rounded text-xl transition-colors disabled:opacity-50 ${
                                  analysisLanguage === 'de' 
                                    ? 'bg-[#3b81f6] shadow-lg' 
                                    : 'hover:bg-dark-600'
                                }`}
                                title="Deutsch"
                              >
                                🇩🇪
                              </button>
                              <button
                                onClick={() => handleLanguageChange('en')}
                                disabled={isTranslating}
                                className={`px-3 py-1.5 rounded text-xl transition-colors disabled:opacity-50 relative ${
                                  analysisLanguage === 'en' 
                                    ? 'bg-[#3b81f6] shadow-lg' 
                                    : 'hover:bg-dark-600'
                                }`}
                                title={isTranslating ? 'Translating...' : 'English'}
                              >
                                {isTranslating ? (
                                  <span className="inline-block animate-spin">⏳</span>
                                ) : (
                                  '🇺🇸'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              // Use English from state, or from video object, or trigger translation
                              let analysis = analysisLanguage === 'en' 
                                ? (englishAnalysis || (video as any).gemini_analysis_en || geminiAnalysis)
                                : geminiAnalysis;
                            
                            // Parse if it's a string
                            if (typeof analysis === 'string') {
                              try {
                                analysis = JSON.parse(analysis);
                              } catch (e) {
                                console.error('Failed to parse analysis JSON:', e);
                              }
                            }
                            
                            console.log('🔍 Analysis data:', analysis);
                            console.log('🔍 music_adaptation value:', analysis?.music_adaptation);
                            console.log('🔍 Has music_adaptation:', !!analysis?.music_adaptation);
                            
                            // Check if this is a trending video analysis (has music_adaptation field)
                            const isTrendingAnalysis = !!(analysis && analysis.music_adaptation);
                            
                            if (!analysis) {
                              console.log('⚠️ No analysis data available');
                              return null;
                            }
                            
                            return (
                              <>
                                {/* Trending Video Analysis */}
                                {isTrendingAnalysis && (
                                  <>
                                    {analysis.original_concept && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-1">💡 Original Concept</h6>
                                        <p 
                                          className={`text-sm text-gray-300 ${canEdit ? 'cursor-text hover:bg-dark-700/50 p-2 rounded transition-colors' : ''}`}
                                          contentEditable={canEdit}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            if (canEdit) {
                                              const newText = e.currentTarget.textContent || '';
                                              const updatedAnalysis = {...analysis, original_concept: newText};
                                              const isTrendingVideo = (video as any).isTrending === true;
                                              const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
                                              const idField = isTrendingVideo ? 'video_id' : 'id';
                                              supabase.from(tableName).update({ gemini_analysis: updatedAnalysis } as any).eq(idField as any, video.id as any);
                                              setGeminiAnalysis(updatedAnalysis);
                                            }
                                          }}
                                        >
                                          {analysis.original_concept}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {analysis.why_it_went_viral && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-1">🚀 Why It Went Viral</h6>
                                        <p 
                                          className={`text-sm text-gray-300 ${canEdit ? 'cursor-text hover:bg-dark-700/50 p-2 rounded transition-colors' : ''}`}
                                          contentEditable={canEdit}
                                          suppressContentEditableWarning
                                          onBlur={(e) => {
                                            if (canEdit) {
                                              const newText = e.currentTarget.textContent || '';
                                              const updatedAnalysis = {...analysis, why_it_went_viral: newText};
                                              const isTrendingVideo = (video as any).isTrending === true;
                                              const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
                                              const idField = isTrendingVideo ? 'video_id' : 'id';
                                              supabase.from(tableName).update({ gemini_analysis: updatedAnalysis } as any).eq(idField as any, video.id as any);
                                              setGeminiAnalysis(updatedAnalysis);
                                            }
                                          }}
                                        >
                                          {analysis.why_it_went_viral}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {analysis.music_adaptation && (
                                      <div className="col-span-full bg-[#222d8c]/20 p-4 rounded-lg border border-[#3b81f6]/30">
                                        <h6 className="text-sm font-semibold text-[#3b81f6] mb-3">🎵 Music Adaptation Strategy</h6>
                                        
                                        {analysis.music_adaptation.core_mechanic && (
                                          <div className="mb-3">
                                            <h6 className="text-xs font-medium text-blue-300 mb-1">Core Mechanic</h6>
                                            <p 
                                              className={`text-sm text-gray-300 ${canEdit ? 'cursor-text hover:bg-dark-700/50 p-2 rounded transition-colors' : ''}`}
                                              contentEditable={canEdit}
                                              suppressContentEditableWarning
                                              onBlur={(e) => {
                                                if (canEdit) {
                                                  const newText = e.currentTarget.textContent || '';
                                                  const updatedAnalysis = {...analysis, music_adaptation: {...analysis.music_adaptation, core_mechanic: newText}};
                                                  const isTrendingVideo = (video as any).isTrending === true;
                                                  const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
                                                  const idField = isTrendingVideo ? 'video_id' : 'id';
                                                  supabase.from(tableName).update({ gemini_analysis: updatedAnalysis } as any).eq(idField as any, video.id as any);
                                                  setGeminiAnalysis(updatedAnalysis);
                                                }
                                              }}
                                            >
                                              {analysis.music_adaptation.core_mechanic}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {analysis.music_adaptation.how_to_flip && (
                                          <div className="mb-3">
                                            <h6 className="text-xs font-medium text-blue-300 mb-1">How to Adapt</h6>
                                            <p 
                                              className={`text-sm text-gray-300 whitespace-pre-line ${canEdit ? 'cursor-text hover:bg-dark-700/50 p-2 rounded transition-colors' : ''}`}
                                              contentEditable={canEdit}
                                              suppressContentEditableWarning
                                              onBlur={(e) => {
                                                if (canEdit) {
                                                  const newText = e.currentTarget.textContent || '';
                                                  const updatedAnalysis = {...analysis, music_adaptation: {...analysis.music_adaptation, how_to_flip: newText}};
                                                  const isTrendingVideo = (video as any).isTrending === true;
                                                  const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
                                                  const idField = isTrendingVideo ? 'video_id' : 'id';
                                                  supabase.from(tableName).update({ gemini_analysis: updatedAnalysis } as any).eq(idField as any, video.id as any);
                                                  setGeminiAnalysis(updatedAnalysis);
                                                }
                                              }}
                                            >
                                              {analysis.music_adaptation.how_to_flip}
                                            </p>
                                          </div>
                                        )}
                                        
                                        {analysis.music_adaptation.example_scenarios && Array.isArray(analysis.music_adaptation.example_scenarios) && (
                                          <div>
                                            <h6 className="text-xs font-medium text-blue-300 mb-2">Example Scenarios</h6>
                                            <ul className="list-disc list-inside space-y-1">
                                              {analysis.music_adaptation.example_scenarios.map((scenario: string, i: number) => (
                                                <li 
                                                  key={i} 
                                                  className={`text-sm text-gray-300 ${canEdit ? 'cursor-text hover:bg-dark-700/50 p-1 rounded transition-colors' : ''}`}
                                                  contentEditable={canEdit}
                                                  suppressContentEditableWarning
                                                  onBlur={(e) => {
                                                    if (canEdit) {
                                                      const newText = e.currentTarget.textContent || '';
                                                      const newScenarios = [...analysis.music_adaptation.example_scenarios];
                                                      newScenarios[i] = newText;
                                                      const updatedAnalysis = {...analysis, music_adaptation: {...analysis.music_adaptation, example_scenarios: newScenarios}};
                                                      const isTrendingVideo = (video as any).isTrending === true;
                                                      const tableName = isTrendingVideo ? 'video_library_recommendations' : 'video_library';
                                                      const idField = isTrendingVideo ? 'video_id' : 'id';
                                                      supabase.from(tableName).update({ gemini_analysis: updatedAnalysis } as any).eq(idField as any, video.id as any);
                                                      setGeminiAnalysis(updatedAnalysis);
                                                    }
                                                  }}
                                                >
                                                  {scenario}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {analysis.best_song_topics && Array.isArray(analysis.best_song_topics) && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-2">🎼 Best Song Topics</h6>
                                        <div className="flex flex-wrap gap-2">
                                          {analysis.best_song_topics.map((topic: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-[#3b81f6]/20 text-[#3b81f6] rounded-full text-xs">{topic}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {analysis.production_requirements && Array.isArray(analysis.production_requirements) && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-2">🎬 Production Requirements</h6>
                                        <ul className="list-disc list-inside space-y-1">
                                          {analysis.production_requirements.map((req: string, i: number) => (
                                            <li key={i} className="text-sm text-gray-300">{req}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {analysis.shotlist_template && Array.isArray(analysis.shotlist_template) && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-2">📋 Shotlist Template</h6>
                                        <ul className="list-decimal list-inside space-y-2">
                                          {analysis.shotlist_template.map((shot: string, i: number) => (
                                            <li key={i} className="text-sm text-gray-300 pl-2">{shot}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {analysis.engagement_factors && Array.isArray(analysis.engagement_factors) && (
                                      <div className="col-span-full">
                                        <h6 className="text-xs font-medium text-[#3b81f6] mb-2">🔥 Engagement Factors</h6>
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
                                {!isTrendingAnalysis && analysis.hook && (
                                  <div className="col-span-full">
                                    <h6 className="text-xs font-medium text-[#3b81f6] mb-1">🎣 Hook</h6>
                                    <p className="text-sm text-gray-300">{analysis.hook}</p>
                                  </div>
                                )}
                                
                                {analysis.content_type && (
                                  <div className="col-span-full">
                                    <h6 className="text-xs font-medium text-[#3b81f6] mb-1">📹 Content Type</h6>
                                    <p className="text-sm text-gray-300">{analysis.content_type}</p>
                                  </div>
                                )}
                                
                                {analysis.visual_style && (
                                  <div className="col-span-full">
                                    <h6 className="text-xs font-medium text-[#3b81f6] mb-1">🎨 Visual Style</h6>
                                    <p className="text-sm text-gray-300">{analysis.visual_style}</p>
                                  </div>
                                )}
                                
                                {analysis.shotlist && Array.isArray(analysis.shotlist) && (
                                  <div className="col-span-full">
                                    <h6 className="text-xs font-medium text-[#3b81f6] mb-2">🎬 Shotlist</h6>
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
                                
                                {analysis.engagement_factors && Array.isArray(analysis.engagement_factors) && (
                                  <div className="col-span-full">
                                    <h6 className="text-xs font-medium text-[#3b81f6] mb-2">🔥 Why This Works</h6>
                                    <ul className="list-disc list-inside space-y-1">
                                      {analysis.engagement_factors.map((factor: string, i: number) => (
                                        <li key={i} className="text-sm text-gray-300">{factor}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          </div>
                      </div>

                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-16 w-16 text-gray-600 mb-4">
                        <path d="M423.5 117.2C419 118.9 416 123.2 416 128C416 132.8 419 137.1 423.5 138.8L480 160L501.2 216.5C502.9 221 507.2 224 512 224C516.8 224 521.1 221 522.8 216.5L544 160L600.5 138.8C605 137.1 608 132.8 608 128C608 123.2 605 118.9 600.5 117.2L544 96L522.8 39.5C521.1 35 516.8 32 512 32C507.2 32 502.9 35 501.2 39.5L480 96L423.5 117.2zM238.5 137.3C235.9 131.6 230.2 128 224 128C217.8 128 212.1 131.6 209.5 137.3L156.4 252.3L41.4 305.4C35.6 308.1 32 313.8 32 320C32 326.2 35.6 331.9 41.3 334.5L156.3 387.6L209.4 502.6C212 508.3 217.7 511.9 223.9 511.9C230.1 511.9 235.8 508.3 238.4 502.6L291.5 387.6L406.5 334.5C412.2 331.9 415.8 326.2 415.8 320C415.8 313.8 412.2 308.1 406.5 305.5L291.5 252.4L238.4 137.4zM448 480L391.5 501.2C387 502.9 384 507.2 384 512C384 516.8 387 521.1 391.5 522.8L448 544L469.2 600.5C470.9 605 475.2 608 480 608C484.8 608 489.1 605 490.8 600.5L512 544L568.5 522.8C573 521.1 576 516.8 576 512C576 507.2 573 502.9 568.5 501.2L512 480L490.8 423.5C489.1 419 484.8 416 480 416C475.2 416 470.9 419 469.2 423.5L448 480z"/>
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No AI Analysis Yet</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {canEdit 
                          ? "This video hasn't been analyzed by Gemini AI yet." 
                          : "This trending video hasn't been analyzed yet. Click below to get AI-powered insights on how to adapt this concept for music promotion."}
                      </p>
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        style={{ backgroundColor: '#222d8c' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a2370'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#222d8c'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor" className="h-4 w-4">
                          <path d="M423.5 117.2C419 118.9 416 123.2 416 128C416 132.8 419 137.1 423.5 138.8L480 160L501.2 216.5C502.9 221 507.2 224 512 224C516.8 224 521.1 221 522.8 216.5L544 160L600.5 138.8C605 137.1 608 132.8 608 128C608 123.2 605 118.9 600.5 117.2L544 96L522.8 39.5C521.1 35 516.8 32 512 32C507.2 32 502.9 35 501.2 39.5L480 96L423.5 117.2zM238.5 137.3C235.9 131.6 230.2 128 224 128C217.8 128 212.1 131.6 209.5 137.3L156.4 252.3L41.4 305.4C35.6 308.1 32 313.8 32 320C32 326.2 35.6 331.9 41.3 334.5L156.3 387.6L209.4 502.6C212 508.3 217.7 511.9 223.9 511.9C230.1 511.9 235.8 508.3 238.4 502.6L291.5 387.6L406.5 334.5C412.2 331.9 415.8 326.2 415.8 320C415.8 313.8 412.2 308.1 406.5 305.5L291.5 252.4L238.4 137.4zM448 480L391.5 501.2C387 502.9 384 507.2 384 512C384 516.8 387 521.1 391.5 522.8L448 544L469.2 600.5C470.9 605 475.2 608 480 608C484.8 608 489.1 605 490.8 600.5L512 544L568.5 522.8C573 521.1 576 516.8 576 512C576 507.2 573 502.9 568.5 501.2L512 480L490.8 423.5C489.1 419 484.8 416 480 416C475.2 416 470.9 419 469.2 423.5L448 480z"/>
                        </svg>
                        {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
