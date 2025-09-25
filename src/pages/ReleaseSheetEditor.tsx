import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Undo, Redo } from 'lucide-react';
import { ReleaseService, ReleaseSheet } from '../services/releaseService';
import { AudioPlayer } from '../components/AudioPlayer';
import { SocialEmbed } from '../components/SocialEmbed';
import { supabase } from '../lib/supabase';

export const ReleaseSheetEditor: React.FC = () => {
  const { id: artistId, sheetId } = useParams<{ id: string; sheetId: string }>();
  const navigate = useNavigate();
  
  const [sheet, setSheet] = useState<ReleaseSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastDragFileTypes, setLastDragFileTypes] = useState<string>('');
  const [lastDragPosition, setLastDragPosition] = useState<{ x: number; y: number } | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadSheet = useCallback(async () => {
    if (!sheetId) return;
    
    try {
      setLoading(true);
      const sheetData = await ReleaseService.getReleaseSheet(sheetId);
      setSheet(sheetData);
      
      // Initialize editor content after sheet loads
      setTimeout(() => {
        if (editorRef.current && sheetData && sheetData.content) {
          const htmlContent = sheetData.content.blocks
            ?.map((block: any) => block.content || '')
            .join('<br>') || '';
          editorRef.current.innerHTML = htmlContent;
          
          // Replace audio player placeholders with actual players
          renderAudioPlayers();
          
          // Replace social embed placeholders with actual embeds
          renderSocialEmbeds();
          
          // Setup image size controls
          renderImages();
        }
      }, 100);
    } catch (error) {
      console.error('Error loading release sheet:', error);
      // Redirect back if sheet not found
      navigate(`/artist/${artistId}/release-sheets`);
    } finally {
      setLoading(false);
    }
  }, [sheetId, navigate, artistId]);

  useEffect(() => {
    if (artistId && sheetId) {
      loadSheet();
    }
  }, [artistId, sheetId, loadSheet]);




  const handleTitleChange = (title: string) => {
    if (!sheet) return;
    setSheet(prev => prev ? { ...prev, title } : null);
    scheduleAutoSave();
  };

  const cleanupContent = (html: string): string => {
    // Remove empty divs with only Tailwind CSS variables
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove empty divs that only contain <br> or whitespace
    const emptyDivs = tempDiv.querySelectorAll('div');
    emptyDivs.forEach(div => {
      const hasOnlyBr = div.innerHTML.trim() === '<br>' || div.innerHTML.trim() === '';
      const hasOnlyWhitespace = div.textContent?.trim() === '';
      
      if (hasOnlyBr || hasOnlyWhitespace) {
        // Check if this div has Tailwind CSS variables (style attribute with --tw- variables)
        const style = div.getAttribute('style');
        if (style && style.includes('--tw-')) {
          div.remove();
        }
      }
    });
    
    return tempDiv.innerHTML;
  };

  const handleContentChange = () => {
    if (!sheet || !editorRef.current) return;
    
    let htmlContent = editorRef.current.innerHTML;
    
    // Clean up empty divs with Tailwind variables
    htmlContent = cleanupContent(htmlContent);
    
    // Update the editor content if it was cleaned
    if (htmlContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = htmlContent;
    }
    
    const content = {
      blocks: [{
        id: 'main-content',
        type: 'paragraph',
        content: htmlContent
      }]
    };
    
    setSheet(prev => prev ? { ...prev, content } : null);
    scheduleAutoSave();
  };

  const scheduleAutoSave = () => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule new save after 5 seconds
    saveTimeoutRef.current = setTimeout(() => {
      saveSheet();
    }, 5000);
  };

  const saveSheet = async () => {
    if (!sheet || saving) return;

    try {
      setSaving(true);
      await ReleaseService.updateReleaseSheet(sheet.id, {
        title: sheet.title,
        content: sheet.content,
        status: sheet.status,
        due_date: sheet.due_date,
        tags: sheet.tags
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving release sheet:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorBlur = () => {
    // Save immediately when focus leaves the editor
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveSheet();
  };

  // Formatting functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const formatBlock = (tag: string) => {
    // For headings, we need to use a different approach
    if (tag.startsWith('h')) {
      execCommand('formatBlock', `<${tag}>`);
    } else {
      execCommand('formatBlock', tag);
    }
  };

  const insertList = (ordered: boolean) => {
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    execCommand(command);
  };

  const setAlignment = (align: string) => {
    execCommand(`justify${align}`);
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const setTextSize = (size: string) => {
    execCommand('fontSize', size);
    setShowSizePicker(false);
  };

  const highlightText = () => {
    // Try different highlight approaches
    if (document.queryCommandSupported('hiliteColor')) {
      execCommand('hiliteColor', '#ffff00');
    } else if (document.queryCommandSupported('backColor')) {
      execCommand('backColor', '#ffff00');
    } else {
      // Fallback: wrap in span with background
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = '#ffff00';
        try {
          range.surroundContents(span);
          handleContentChange();
        } catch (e) {
          console.log('Highlight failed:', e);
        }
      }
    }
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    
    if (rows && cols && parseInt(rows) > 0 && parseInt(cols) > 0) {
      let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1rem 0; border: 1px solid #ccc;">';
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 100px; min-height: 30px;">&nbsp;</td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table><p>&nbsp;</p>';
      
      // Insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = tableHTML;
        const frag = document.createDocumentFragment();
        let node;
        while ((node = div.firstChild)) {
          frag.appendChild(node);
        }
        range.insertNode(frag);
        handleContentChange();
      } else {
        execCommand('insertHTML', tableHTML);
      }
    }
  };

  const undoAction = () => {
    execCommand('undo');
  };

  const redoAction = () => {
    execCommand('redo');
  };

  // Audio upload functions
  const uploadAudioFile = async (file: File): Promise<string | null> => {
    try {
      setUploadingAudio(true);
      
      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size too large. Maximum size is 50MB.');
        return null;
      }
      
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg'];
      const validExtensions = ['mp3', 'wav', 'm4a', 'flac', 'ogg'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt || '')) {
        alert('Unsupported file type. Please use MP3, WAV, M4A, FLAC, or OGG files.');
        return null;
      }
      
      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `release-sheets/${sheetId}/audio/${fileName}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('release-sheet-files')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading audio:', error);
        
        // Show user-friendly error messages
        if (error.message.includes('Bucket not found')) {
          alert('Storage bucket not configured. Please contact support.');
        } else if (error.message.includes('File size')) {
          alert('File too large. Maximum size is 50MB.');
        } else if (error.message.includes('not allowed')) {
          alert('File type not allowed. Please use MP3, WAV, M4A, FLAC, or OGG files.');
        } else {
          alert('Failed to upload audio file. Please try again.');
        }
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('release-sheet-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading audio file:', error);
      alert('An unexpected error occurred while uploading. Please try again.');
      return null;
    } finally {
      setUploadingAudio(false);
    }
  };

  // Image upload functions
  const uploadImageFile = async (file: File): Promise<string | null> => {
    console.log('📤 UPLOAD IMAGE FILE - Starting upload for:', file.name);
    
    try {
      
      // Validate file size (10MB limit for images)
      console.log('📏 Validating file size:', file.size, 'bytes');
      if (file.size > 10 * 1024 * 1024) {
        console.log('❌ File too large:', file.size);
        alert('Image size too large. Maximum size is 10MB.');
        return null;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      console.log('🔍 File validation:', {
        fileType: file.type,
        fileExtension: fileExt,
        validTypes,
        validExtensions
      });
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt || '')) {
        console.log('❌ Invalid file type');
        alert('Unsupported file type. Please use JPG, PNG, GIF, or WebP files.');
        return null;
      }
      
      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `release-sheets/${sheetId}/images/${fileName}`;
      
      console.log('📁 Generated file path:', filePath);

      // Upload to Supabase Storage (use same bucket as audio files)
      
      // Add timeout to prevent hanging
      const uploadPromise = supabase.storage
        .from('release-sheet-files')
        .upload(filePath, file);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      );
      
      const { error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Supabase upload error:', error);
        alert('Failed to upload image file. Please try again.');
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('release-sheet-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('💥 Upload exception:', error);
      alert('An unexpected error occurred while uploading. Please try again.');
      return null;
    } finally {
      // Image upload completed
    }
  };

  const insertAudioPlayer = (audioUrl: string, fileName: string) => {
    const audioId = `audio-${Date.now()}`;
    const audioPlayerHTML = `
      <div class="audio-player-container my-4" data-audio-url="${audioUrl}" data-file-name="${fileName}" data-audio-id="${audioId}">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">🎵 ${fileName}</span>
        </div>
        <p class="text-xs text-gray-500 mb-2">Audio player will load when viewing</p>
      </div>
    `;

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = audioPlayerHTML;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
      handleContentChange();
    } else {
      execCommand('insertHTML', audioPlayerHTML);
    }
  };

  const insertAtPosition = (html: string, position: { x: number; y: number; range: Range | null }) => {
    if (!position.range) {
      // Fallback to execCommand if no range available
      execCommand('insertHTML', html);
      return;
    }
    
    const div = document.createElement('div');
    div.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node;
    while ((node = div.firstChild)) {
      frag.appendChild(node);
    }
    position.range.deleteContents();
    position.range.insertNode(frag);
    handleContentChange();
  };





  const handleFileDrop = async (files: FileList) => {
    console.log('🚀 HANDLE FILE DROP - Processing', files.length, 'files');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processing file ${i + 1}/${files.length}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Check if it's an audio file
      if (file.type.startsWith('audio/') || 
          file.name.toLowerCase().endsWith('.mp3') || 
          file.name.toLowerCase().endsWith('.wav') ||
          file.name.toLowerCase().endsWith('.m4a') ||
          file.name.toLowerCase().endsWith('.flac')) {
        
        console.log('🎵 AUDIO FILE detected:', file.name);
        const audioUrl = await uploadAudioFile(file);
        if (audioUrl) {
          console.log('✅ Audio uploaded successfully:', audioUrl);
          insertAudioPlayer(audioUrl, file.name);
        } else {
          console.log('❌ Audio upload failed');
        }
      }
      // Check if it's an image file
      else if (file.type.startsWith('image/') || 
               file.name.toLowerCase().endsWith('.jpg') || 
               file.name.toLowerCase().endsWith('.jpeg') ||
               file.name.toLowerCase().endsWith('.png') ||
               file.name.toLowerCase().endsWith('.gif') ||
               file.name.toLowerCase().endsWith('.webp')) {
        
        console.log('📸 IMAGE FILE detected:', file.name);
        console.log('🔄 Starting image upload process...');
        
        // Try direct insertion without placeholder for now
        const imageUrl = await uploadImageFile(file);
        console.log('📤 Upload result:', imageUrl);
        
        if (imageUrl) {
          console.log('✅ Image uploaded successfully, creating HTML...');
          
          // Insert image directly
          const imageId = `image-${Date.now()}`;
          const imageHTML = `
            <div class="image-container group relative block my-4 text-center" data-image-url="${imageUrl}" data-file-name="${file.name}" data-image-id="${imageId}" data-size="M">
              <img src="${imageUrl}" alt="${file.name}" class="max-w-md h-auto rounded-lg shadow-sm mx-auto" loading="lazy" />
              <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-md p-1">
                <div class="flex space-x-1">
                  <button class="size-btn text-white text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 cursor-pointer" data-size="S">S</button>
                  <button class="size-btn text-white text-xs px-2 py-1 rounded bg-blue-500 cursor-pointer" data-size="M">M</button>
                  <button class="size-btn text-white text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 cursor-pointer" data-size="L">L</button>
                  <button class="delete-btn text-white text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 cursor-pointer ml-1" title="Delete image">×</button>
                </div>
              </div>
            </div>
          `;
          
          console.log('🎯 Inserting image HTML at position...');
          
          // Use the current selection or fall back to execCommand
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const position = { x: 0, y: 0, range };
            console.log('📍 Using current selection position');
            insertAtPosition(imageHTML, position);
          } else {
            console.log('📍 Using execCommand insertHTML');
            execCommand('insertHTML', imageHTML);
          }
          
          console.log('🔧 Setting up size controls...');
          // Setup size controls
          setTimeout(() => {
            renderImages();
            console.log('✅ Image insertion completed');
          }, 100);
        } else {
          console.log('❌ Image upload failed');
        }
      } else {
        console.log('❓ Unknown file type:', file.type, file.name);
      }
    }
    
    console.log('🏁 FILE DROP processing completed');
  };

  const getDropPosition = (e: React.DragEvent) => {
    if (!editorRef.current) return null;
    
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find the closest text node or element to insert before
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    return { x, y, range };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only log once when drag starts or file type changes
    const items = Array.from(e.dataTransfer.items);
    const currentFileTypes = items.map(item => item.type).join(',');
    
    if (!isDragOver || lastDragFileTypes !== currentFileTypes) {
      console.log('🔄 DRAG OVER - DataTransfer items:', e.dataTransfer.items.length);
      items.forEach((item, index) => {
        console.log(`📄 Item ${index}:`, {
          kind: item.kind,
          type: item.type,
          fileName: item.getAsFile()?.name
        });
      });
      setLastDragFileTypes(currentFileTypes);
    }

    const hasMediaFiles = items.some(item =>
      item.type.startsWith('audio/') ||
      item.type.startsWith('image/') ||
      (item.kind === 'file' && item.type === '' &&
       ['mp3', 'wav', 'm4a', 'flac', 'jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext =>
         item.getAsFile()?.name.toLowerCase().endsWith(`.${ext}`)
       ))
    );

    if (!isDragOver && hasMediaFiles) {
      console.log('🎯 Has media files:', hasMediaFiles);
    }

    if (hasMediaFiles) {
      setIsDragOver(true);
      const position = getDropPosition(e);
      
      // Only log position changes that are significant (more than 5px difference)
      if (position && (!lastDragPosition || 
          Math.abs(position.x - lastDragPosition.x) > 5 || 
          Math.abs(position.y - lastDragPosition.y) > 5)) {
        console.log('📍 Drop position:', position);
        setLastDragPosition({ x: position.x, y: position.y });
      }
      
      if (position) {
        setDragPosition({ x: position.x, y: position.y });
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only hide if leaving the editor entirely
    if (!editorRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDragPosition(null);
      setLastDragFileTypes('');
      setLastDragPosition(null);
      
      // Clean up any unwanted elements when drag ends
      if (editorRef.current) {
        const htmlContent = cleanupContent(editorRef.current.innerHTML);
        if (htmlContent !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = htmlContent;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 DROP EVENT - Files dropped:', e.dataTransfer.files.length);
    
    setIsDragOver(false);
    setDragPosition(null);
    
    // Set cursor position for insertion
    const position = getDropPosition(e);
    console.log('📍 Final drop position:', position);
    
    if (position?.range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(position.range);
        console.log('✅ Selection set at drop position');
      }
    }
    
    const files = e.dataTransfer.files;
    console.log('📁 Files to process:', Array.from(files).map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));
    
    if (files.length > 0) {
      handleFileDrop(files);
    } else {
      console.log('❌ No files to drop');
    }
    
    // Clean up any unwanted elements after drop
    setTimeout(() => {
      if (editorRef.current) {
        const htmlContent = cleanupContent(editorRef.current.innerHTML);
        if (htmlContent !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = htmlContent;
        }
      }
    }, 100);
  };

  // Social media URL detection
  const detectSocialMediaUrl = (text: string): { platform: 'instagram' | 'tiktok' | 'youtube'; url: string } | null => {
    const instagramRegex = /https?:\/\/(www\.)?(instagram\.com\/(p|reel)\/[^\/\s]+)/i;
    const tiktokRegex = /https?:\/\/(www\.)?(tiktok\.com\/@[^\/]+\/video\/\d+)/i;
    const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\/\s]+/i;

    if (instagramRegex.test(text)) {
      const match = text.match(instagramRegex);
      return match ? { platform: 'instagram', url: match[0] } : null;
    }
    
    if (tiktokRegex.test(text)) {
      const match = text.match(tiktokRegex);
      return match ? { platform: 'tiktok', url: match[0] } : null;
    }
    
    if (youtubeRegex.test(text)) {
      const match = text.match(youtubeRegex);
      return match ? { platform: 'youtube', url: match[0] } : null;
    }
    
    return null;
  };

  const insertSocialEmbed = (url: string, platform: 'instagram' | 'tiktok' | 'youtube') => {
    const embedId = `social-${Date.now()}`;
    const embedHTML = `
      <div class="social-embed-container" data-url="${url}" data-platform="${platform}" data-embed-id="${embedId}">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">🔗 ${platform.charAt(0).toUpperCase() + platform.slice(1)} Post</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">Social embed will load when viewing</p>
        </div>
      </div>
    `;

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.innerHTML = embedHTML;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = div.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
      handleContentChange();
      
      // Immediately render the social embed
      setTimeout(() => {
        renderSocialEmbeds();
      }, 100);
    } else {
      execCommand('insertHTML', embedHTML);
      // Immediately render the social embed
      setTimeout(() => {
        renderSocialEmbeds();
      }, 100);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const socialMedia = detectSocialMediaUrl(pastedText);
    
    if (socialMedia) {
      e.preventDefault();
      insertSocialEmbed(socialMedia.url, socialMedia.platform);
    }
  };

  const renderAudioPlayers = () => {
    if (!editorRef.current) return;
    
    const audioContainers = editorRef.current.querySelectorAll('.audio-player-container');
    audioContainers.forEach((container) => {
      const audioUrl = container.getAttribute('data-audio-url');
      const fileName = container.getAttribute('data-file-name');
      const audioId = container.getAttribute('data-audio-id');
      
      if (audioUrl && fileName && audioId) {
        // Create a React root for this audio player
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(container);
          root.render(
            <AudioPlayer 
              audioUrl={audioUrl} 
              fileName={fileName}
              onDelete={() => {
                container.remove();
                handleContentChange();
              }}
            />
          );
        });
      }
    });
  };

  const renderSocialEmbeds = () => {
    if (!editorRef.current) return;
    
    const socialContainers = editorRef.current.querySelectorAll('.social-embed-container');
    socialContainers.forEach((container) => {
      // Skip if already rendered (has React content)
      if (container.querySelector('[data-react-root]')) return;
      
      const url = container.getAttribute('data-url');
      const platform = container.getAttribute('data-platform') as 'instagram' | 'tiktok' | 'youtube';
      const embedId = container.getAttribute('data-embed-id');
      
      if (url && platform && embedId) {
        // Clear existing content and add React root marker
        container.innerHTML = '<div data-react-root="true"></div>';
        const reactContainer = container.querySelector('[data-react-root]') as HTMLElement;
        
        // Create a React root for this social embed
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(reactContainer);
          root.render(
            <SocialEmbed 
              url={url} 
              platform={platform}
              onDelete={() => {
                container.remove();
                handleContentChange();
              }}
            />
          );
        });
      }
    });
  };

  const renderImages = () => {
    if (!editorRef.current) return;
    
    const imageContainers = editorRef.current.querySelectorAll('.image-container');
    imageContainers.forEach((container) => {
      // Handle size buttons
      const sizeButtons = container.querySelectorAll('.size-btn');
      sizeButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const newSize = button.getAttribute('data-size') as 'S' | 'M' | 'L';
          const img = container.querySelector('img');
          const sizeClasses = {
            S: 'max-w-xs',
            M: 'max-w-md', 
            L: 'max-w-2xl'
          };
          
          if (img) {
            // Remove old size classes
            img.classList.remove('max-w-xs', 'max-w-md', 'max-w-2xl');
            // Add new size class and ensure center alignment
            img.classList.add(sizeClasses[newSize], 'mx-auto');
            
            // Update button states
            sizeButtons.forEach(btn => {
              btn.classList.remove('bg-blue-500');
              btn.classList.add('bg-gray-600', 'hover:bg-gray-500');
            });
            button.classList.remove('bg-gray-600', 'hover:bg-gray-500');
            button.classList.add('bg-blue-500');
            
            // Update container data attribute
            container.setAttribute('data-size', newSize);
            handleContentChange();
          }
        });
      });
      
      // Handle delete button
      const deleteButton = container.querySelector('.delete-btn');
      if (deleteButton) {
        deleteButton.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to delete this image?')) {
            container.remove();
            handleContentChange();
          }
        });
      }
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.relative')) {
        setShowColorPicker(false);
        setShowSizePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sheet not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The release sheet you're looking for doesn't exist.
          </p>
          <Link
            to={`/artist/${artistId}/release-sheets`}
            className="btn"
          >
            Back to Release Sheets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Combined Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        {/* Sheet Title */}
        <div className="mx-auto py-4" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <div className="flex items-center space-x-4">
            <Link
              to={`/artist/${artistId}/release-sheets`}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <input
              type="text"
              value={sheet.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled Sheet"
              className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-left"
              style={{ background: 'none', backgroundColor: 'transparent' }}
            />
          </div>
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between mt-4">
            <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button 
                onClick={() => execCommand('bold')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bold h-4 w-4">
                  <path d="M14 12a4 4 0 0 0 0-8H6v8"></path>
                  <path d="M15 20a4 4 0 0 0 0-8H6v8Z"></path>
                </svg>
              </button>
              <button 
                onClick={() => execCommand('italic')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Italic"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-italic h-4 w-4">
                  <line x1="19" x2="10" y1="4" y2="4"></line>
                  <line x1="14" x2="5" y1="20" y2="20"></line>
                  <line x1="15" x2="9" y1="4" y2="20"></line>
                </svg>
              </button>
              <button 
                onClick={() => execCommand('underline')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-underline h-4 w-4">
                  <path d="M6 4v6a6 6 0 0 0 12 0V4"></path>
                  <line x1="4" x2="20" y1="20" y2="20"></line>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button 
                onClick={() => formatBlock('h1')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Heading 1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading1 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="m17 12 3-2v8"></path>
                </svg>
              </button>
              <button 
                onClick={() => formatBlock('h2')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Heading 2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading2 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"></path>
                </svg>
              </button>
              <button 
                onClick={() => formatBlock('h3')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Heading 3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading3 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"></path>
                  <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button 
                onClick={() => insertList(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Bullet List"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list h-4 w-4">
                  <line x1="8" x2="21" y1="6" y2="6"></line>
                  <line x1="8" x2="21" y1="12" y2="12"></line>
                  <line x1="8" x2="21" y1="18" y2="18"></line>
                  <line x1="3" x2="3.01" y1="6" y2="6"></line>
                  <line x1="3" x2="3.01" y1="12" y2="12"></line>
                  <line x1="3" x2="3.01" y1="18" y2="18"></line>
                </svg>
              </button>
              <button 
                onClick={() => insertList(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Numbered List"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-ordered h-4 w-4">
                  <line x1="10" x2="21" y1="6" y2="6"></line>
                  <line x1="10" x2="21" y1="12" y2="12"></line>
                  <line x1="10" x2="21" y1="18" y2="18"></line>
                  <path d="M4 6h1v4"></path>
                  <path d="M4 10h2"></path>
                  <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button 
                onClick={() => formatBlock('blockquote')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Quote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote h-4 w-4">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2 relative">
              <button 
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Text Color"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette h-4 w-4">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                </svg>
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20">
                  <div className="grid grid-cols-6 gap-1">
                    {['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                      '#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#0066ff', '#6600ff',
                      '#ff0066', '#ff3366', '#ff6699', '#66ff99', '#3366ff', '#9966ff'].map(color => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setShowSizePicker(!showSizePicker)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Text Size"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type h-4 w-4">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" x2="15" y1="20" y2="20"></line>
                  <line x1="12" x2="12" y1="4" y2="20"></line>
                </svg>
              </button>
              {showSizePicker && (
                <div className="absolute top-full left-12 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20">
                  <div className="flex flex-col space-y-1">
                    {[
                      { size: '1', label: 'Small' },
                      { size: '3', label: 'Normal' },
                      { size: '4', label: 'Medium' },
                      { size: '5', label: 'Large' },
                      { size: '6', label: 'Extra Large' },
                      { size: '7', label: 'Huge' }
                    ].map(({ size, label }) => (
                      <button
                        key={size}
                        onClick={() => setTextSize(size)}
                        className="px-3 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button 
                onClick={highlightText}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Highlight Text"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-highlighter h-4 w-4">
                  <path d="m9 11-6 6v3h9l3-3"></path>
                  <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
                </svg>
              </button>
              <button 
                onClick={insertTable}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Insert Table"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table h-4 w-4">
                  <path d="M12 3v18"></path>
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M3 15h18"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setAlignment('Left')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Align Left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-left h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="15" x2="3" y1="12" y2="12"></line>
                  <line x1="17" x2="3" y1="18" y2="18"></line>
                </svg>
              </button>
              <button 
                onClick={() => setAlignment('Center')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Align Center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-center h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="17" x2="7" y1="12" y2="12"></line>
                  <line x1="19" x2="5" y1="18" y2="18"></line>
                </svg>
              </button>
              <button 
                onClick={() => setAlignment('Right')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Align Right"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-right h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="21" x2="9" y1="12" y2="12"></line>
                  <line x1="21" x2="7" y1="18" y2="18"></line>
                </svg>
              </button>
            </div>
            </div>
            
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-1">
              <button 
                onClick={undoAction}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </button>
              <button 
                onClick={redoAction}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Release Info */}
          {sheet.release_title && (
            <div className="flex items-center space-x-2 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-300">
                Related to release: <strong>{sheet.release_title}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Save Status */}
      <div className="fixed top-4 right-4 z-50">
        {saving && (
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
            <span>Saving...</span>
          </div>
        )}
        {lastSaved && !saving && (
          <div 
            className="text-white opacity-50 px-3 py-1 rounded-full text-sm hover:opacity-100 transition-opacity cursor-pointer group relative"
            title={`Saved ${lastSaved.toLocaleTimeString()}`}
          >
            {/* Diskette with checkmark icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
              {/* Diskette outline */}
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/>
              <polyline points="7,3 7,8 15,8"/>
              {/* Checkmark */}
              <path d="m9 16 2 2 4-4" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            
            {/* Tooltip on hover */}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleEditorBlur}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="mx-auto py-12 min-h-[calc(100vh-200px)] outline-none text-gray-900 dark:text-white prose prose-lg max-w-none dark:prose-invert relative"
        style={{
          lineHeight: '1.7',
          fontSize: '18px',
          paddingLeft: '10%',
          paddingRight: '10%',
        }}
        suppressContentEditableWarning={true}
        data-placeholder="Start writing your release sheet..."
      >
        {/* Drop Line Indicator */}
        {isDragOver && dragPosition && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: '10%',
              right: '10%',
              top: `${dragPosition.y}px`,
              height: '2px',
              backgroundColor: '#3b82f6',
              boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)',
            }}
          >
            <div className="absolute -left-2 -top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
            <div className="absolute -right-2 -top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
          </div>
        )}
        
        {/* Upload Status */}
        {uploadingAudio && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg shadow-lg z-20">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Uploading audio...</span>
            </div>
          </div>
        )}
        
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0;
          color: inherit;
        }
        
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.875rem 0;
          color: inherit;
        }
        
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0.75rem 0;
          color: inherit;
        }
        
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0.375rem;
        }
        
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          color: inherit;
        }
        
        [contenteditable] ul {
          list-style-type: disc;
          list-style-position: outside;
        }
        
        [contenteditable] ol {
          list-style-type: decimal;
          list-style-position: outside;
        }
        
        [contenteditable] li {
          margin: 0.25rem 0;
          color: inherit;
          display: list-item;
        }
        
        [contenteditable] li::marker {
          color: currentColor;
        }
        
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        
        [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        
        [contenteditable] td, [contenteditable] th {
          border: 1px solid #ccc;
          padding: 8px;
          min-width: 100px;
          min-height: 30px;
        }
        
        [contenteditable]:focus {
          outline: none;
        }
      `}</style>

    </div>
  );
};
