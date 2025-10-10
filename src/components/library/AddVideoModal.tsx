import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader, Plus, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoAdded: (queueId: string) => void;
}

export const AddVideoModal: React.FC<AddVideoModalProps> = ({ isOpen, onClose, onVideoAdded }) => {
  const [url, setUrl] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [showCustomGenreInput, setShowCustomGenreInput] = useState(false);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [type, setType] = useState<'song-specific' | 'off-topic'>('song-specific');
  const [actor, setActor] = useState<'solo' | 'multiple'>('solo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });

  const predefinedGenres = ['Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Jazz', 'Classical'];
  const categoryOptions = ['Performance', 'Entertainment', 'Relatable', 'Personal'];

  // Load custom genres from database
  useEffect(() => {
    if (isOpen) {
      loadCustomGenres();
    }
  }, [isOpen]);

  // Load preview image when URL changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!url || (!url.includes('tiktok.com') && !url.includes('instagram.com'))) {
        setPreviewImage(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        // Use the existing edge function to get video metadata
        const response = await supabase.functions.invoke('get-video-preview', {
          body: { url }
        });

        if (response.data?.thumbnailUrl) {
          setPreviewImage(response.data.thumbnailUrl);
        } else {
          setPreviewImage(null);
        }
      } catch (error) {
        console.error('Error loading preview:', error);
        setPreviewImage(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const debounceTimer = setTimeout(loadPreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [url]);

  const loadCustomGenres = async () => {
    try {
      const { data } = await supabase
        .from('custom_genres')
        .select('name')
        .order('name');
      
      if (data) {
        setCustomGenres(data.map((g: any) => g.name));
      }
    } catch (error) {
      console.error('Error loading custom genres:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!url.trim()) {
      setError('Please enter a video URL');
      return;
    }

    // Validate URL format
    if (!url.includes('tiktok.com') && !url.includes('instagram.com')) {
      setError('Please enter a valid TikTok or Instagram URL');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('add-library-video', {
        body: { 
          sourceUrl: url.trim(),
          genre: genres.length > 0 ? genres : null,
          category: categories.length > 0 ? categories : null,
          type: type,
          actor: actor
        },
      });

      console.log('Full response:', response);

      if (response.error) {
        let errorMessage = 'Failed to add video';
        
        try {
          const errorResponse = response.error.context;
          if (errorResponse && typeof errorResponse.text === 'function') {
            const errorText = await errorResponse.text();
            console.log('Error response body:', errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch (e) {
          console.error('Failed to parse error:', e);
        }
        
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.success) {
        throw new Error('Unexpected response from server');
      }

      // Show success message
      setSuccess(true);
      
      // Notify parent with queue ID
      if (response.data?.queueId) {
        onVideoAdded(response.data.queueId);
      }
      
      // Wait briefly to show success, then reset and close
      setTimeout(() => {
        setUrl('');
        setGenres([]);
        setShowCustomGenreInput(false);
        setCustomGenreInput('');
        setCategories([]);
        setType('song-specific');
        setActor('solo');
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error adding video:', err);
      setError(err instanceof Error ? err.message : 'Failed to add video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setUrl('');
      setGenres([]);
      setShowCustomGenreInput(false);
      setCustomGenreInput('');
      setCategories([]);
      setType('song-specific');
      setActor('solo');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(g => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const addCustomGenre = async () => {
    const trimmedGenre = customGenreInput.trim();
    if (trimmedGenre && !genres.includes(trimmedGenre)) {
      setGenres([...genres, trimmedGenre]);
      
      // If it's not in predefined or custom genres, save it to database
      if (!predefinedGenres.includes(trimmedGenre) && !customGenres.includes(trimmedGenre)) {
        try {
          await supabase
            .from('custom_genres' as any)
            .insert({ name: trimmedGenre } as any);
          setCustomGenres([...customGenres, trimmedGenre].sort());
        } catch (error) {
          console.error('Error saving custom genre:', error);
        }
      }
      
      setCustomGenreInput('');
      setShowCustomGenreInput(false);
    }
  };

  const handleCustomGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomGenre();
    } else if (e.key === 'Escape') {
      setShowCustomGenreInput(false);
      setCustomGenreInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#121313] rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Add Video to Library</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div 
            ref={inputRef}
            className="relative"
            onMouseEnter={() => {
              if (previewImage && inputRef.current) {
                const rect = inputRef.current.getBoundingClientRect();
                setPreviewPosition({ top: rect.top, left: rect.left + rect.width / 2 });
                setIsInputFocused(true);
              }
            }}
            onMouseLeave={() => setIsInputFocused(false)}
          >
            <label htmlFor="video-url" className="block text-sm font-medium text-gray-300 mb-2">
              Video URL *
            </label>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => {
                if (inputRef.current) {
                  const rect = inputRef.current.getBoundingClientRect();
                  setPreviewPosition({ top: rect.top, left: rect.left + rect.width / 2 });
                }
                setIsInputFocused(true);
              }}
              onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
              placeholder="https://www.tiktok.com/@username/video/..."
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            
            <p className="mt-2 text-xs text-gray-400">
              Supported platforms: TikTok and Instagram
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genres (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {[...predefinedGenres, ...customGenres].map((genre: string) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  disabled={isSubmitting}
                  className={`px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-50 flex items-center gap-1 ${
                    genres.includes(genre)
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                  }`}
                >
                  {genres.includes(genre) && <Check className="h-3 w-3" />}
                  {genre}
                </button>
              ))}
              {!showCustomGenreInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGenreInput(true)}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-xs bg-primary-500/50 text-primary-300 rounded-full hover:bg-primary-500/70 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    onKeyDown={handleCustomGenreKeyDown}
                    placeholder="Custom genre"
                    autoFocus
                    disabled={isSubmitting}
                    className="px-3 py-1 text-xs bg-dark-700 border border-primary-500 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 w-32"
                  />
                  <button
                    type="button"
                    onClick={addCustomGenre}
                    disabled={isSubmitting || !customGenreInput.trim()}
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
                    disabled={isSubmitting}
                    className="text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categories (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map((cat) => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-primary-500 bg-dark-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <span className="text-gray-300">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type *
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="song-specific"
                  checked={type === 'song-specific'}
                  onChange={(e) => setType(e.target.value as 'song-specific')}
                  disabled={isSubmitting}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Song-Specific</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="off-topic"
                  checked={type === 'off-topic'}
                  onChange={(e) => setType(e.target.value as 'off-topic')}
                  disabled={isSubmitting}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Off-Topic</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Actor *
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="solo"
                  checked={actor === 'solo'}
                  onChange={(e) => setActor(e.target.value as 'solo')}
                  disabled={isSubmitting}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Solo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="multiple"
                  checked={actor === 'multiple'}
                  onChange={(e) => setActor(e.target.value as 'multiple')}
                  disabled={isSubmitting}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-gray-300">Multiple</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
              <p className="text-sm text-green-400">
                Video added to processing queue! It will appear in the library shortly.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Portal - Rendered outside modal to avoid clipping */}
      {isInputFocused && previewImage && createPortal(
        <div 
          className="fixed pointer-events-none"
          style={{ 
            top: `${previewPosition.top + 12}px`,
            left: `${previewPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10000
          }}
        >
          <div className="bg-dark-800 border border-gray-600 rounded-lg p-2 shadow-2xl">
            <img 
              src={previewImage} 
              alt="Video preview" 
              className="w-24 h-auto rounded"
              onError={() => setPreviewImage(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Loading Portal */}
      {isInputFocused && isLoadingPreview && createPortal(
        <div 
          className="fixed pointer-events-none"
          style={{ 
            top: `${previewPosition.top + 12}px`,
            left: `${previewPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10000
          }}
        >
          <div className="bg-dark-800 border border-gray-600 rounded-lg p-4 shadow-2xl">
            <Loader className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
