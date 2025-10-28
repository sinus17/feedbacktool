import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Undo, Redo, Trash2 } from 'lucide-react';
import interact from 'interactjs';
import { ReleaseService, ReleaseSheet } from '../services/releaseService';
import { SocialEmbed } from '../components/SocialEmbed';
import { ReleaseSheetEditModal } from '../components/ReleaseSheetEditModal';
import { VersionHistoryDropdown } from '../components/VersionHistoryDropdown';
import { EditorJSWrapper } from '../components/editorjs/EditorJSWrapper';
import { htmlToEditorJS, editorJSToHTML } from '../utils/htmlToEditorJS';
import { OutputData } from '@editorjs/editorjs';
import { PlaceholderHelper } from '../components/PlaceholderHelper';
import { supabase } from '../lib/supabase';

// Helper function to format date as DD.MM.YYYY
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const ReleaseSheetEditor: React.FC = () => {
  const { id: artistId, sheetId, templateId } = useParams<{ id: string; sheetId: string; templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdmin = (location.state as any)?.fromAdmin === true;
  const isTemplateFromState = (location.state as any)?.isTemplate === true;
  const isTemplate = !!templateId || (artistId === 'template' || isTemplateFromState); // Check if we're editing a template
  const itemId = templateId || sheetId; // Use templateId if available, otherwise sheetId
  const backPath = fromAdmin ? '/release-sheets' : (artistId === 'template' ? '/release-sheets' : `/artist/${artistId}/release-sheets`);
  
  const [sheet, setSheet] = useState<ReleaseSheet | null>(null);
  const [editorData, setEditorData] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [realtimeUpdate, setRealtimeUpdate] = useState(false);
  const [lockedNodes, setLockedNodes] = useState<number[]>([]);
  const [linkedRelease, setLinkedRelease] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimestampRef = useRef<string | null>(null);
  
  // Add CSS for placeholder styling in templates
  useEffect(() => {
    if (isTemplate && editorRef.current) {
      // Add a function to wrap placeholders with styled spans
      const stylePlaceholders = () => {
        if (!editorRef.current) return;
        
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const placeholderPattern = /\$[a-z_]+\/[a-z_]+\$/g;
        let node;
        const nodesToReplace: { node: Text; matches: RegExpMatchArray }[] = [];
        
        while (node = walker.nextNode() as Text) {
          const matches = node.textContent?.match(placeholderPattern);
          if (matches && matches.length > 0) {
            nodesToReplace.push({ node, matches });
          }
        }
        
        nodesToReplace.forEach(({ node }) => {
          const text = node.textContent || '';
          const parent = node.parentElement;
          if (!parent || parent.querySelector('.placeholder-styled')) return;
          
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          
          text.replace(placeholderPattern, (match, offset) => {
            // Add text before placeholder
            if (offset > lastIndex) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
            }
            
            // Create styled span for placeholder
            const span = document.createElement('span');
            span.className = 'placeholder-styled';
            span.style.cssText = `
              background-color: #e5e7eb;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
              color: #374151;
            `;
            span.textContent = match;
            fragment.appendChild(span);
            
            lastIndex = offset + match.length;
            return match;
          });
          
          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
          }
          
          if (fragment.childNodes.length > 0) {
            parent.replaceChild(fragment, node);
          }
        });
      };
      
      // Run after content loads
      const timer = setTimeout(stylePlaceholders, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isTemplate, sheet]);

  const loadSheet = useCallback(async () => {
    console.log('🔄 loadSheet() called - itemId:', itemId, 'isTemplate:', isTemplate);
    
    if (!itemId) return;
    
    try {
      setLoading(true);
      let sheetData;
      
      if (isTemplate) {
        // Load from templates table
        const { data, error } = await (supabase as any)
          .from('release_sheet_templates')
          .select('*')
          .eq('id', itemId)
          .single();
        
        if (error) throw error;
        const template: any = data;
        
        // Load locked nodes if available
        if (template.locked_nodes) {
          setLockedNodes(template.locked_nodes);
        }
        
        // Map template structure to sheet structure
        sheetData = {
          ...template,
          title: template.name,
          artist_id: '', // Templates don't have artist_id
          release_id: null,
          release_title: null,
          status: 'draft' as const,
          tags: [],
          cover_image_url: null,
          due_date: null,
          completed_at: null
        };
      } else {
        sheetData = await ReleaseService.getReleaseSheet(itemId);
      }
      
      console.log('=== LOAD SHEET DATA ===');
      console.log('Loaded sheet data:', sheetData);
      console.log('Content blocks:', sheetData?.content?.blocks);
      console.log('First block content (first 200 chars):', sheetData?.content?.blocks?.[0]?.content?.substring(0, 200));
      console.log('Is template?', isTemplate);
      
      setSheet(sheetData);
      console.log('Sheet state set');
      
      // Convert HTML to Editor.js format
      if (sheetData?.content?.blocks) {
        const htmlContent = sheetData.content.blocks
          .map((block: any) => block.content || '')
          .join('');
        const editorJSData = htmlToEditorJS(htmlContent, sheetData.artist_id || artistId);
        console.log('📝 Converted HTML to Editor.js:', editorJSData);
        setEditorData(editorJSData);
      }
      
      // Set lastSaved to the sheet's updated_at timestamp
      if (sheetData?.updated_at) {
        setLastSaved(new Date(sheetData.updated_at));
      }
      
      // Initialize editor content after sheet loads
      setTimeout(() => {
        console.log('=== TIMEOUT FIRED (100ms) ===');
        console.log('editorRef.current exists?', !!editorRef.current);
        console.log('sheetData exists?', !!sheetData);
        console.log('sheetData.content exists?', !!sheetData?.content);
        
        if (editorRef.current && sheetData && sheetData.content) {
          let htmlContent = sheetData.content.blocks
            ?.map((block: any) => block.content || '')
            .join('<br>') || '';
          
          // Create a temporary div to parse and clean the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          
          // Clean inline styles but preserve text-align and other formatting
          const allElements = tempDiv.querySelectorAll('*');
          allElements.forEach((el: any) => {
            if (el.hasAttribute('style')) {
              // Extract and preserve important styles
              const textAlign = el.style.textAlign;
              const width = el.style.width;
              const height = el.style.height;
              const transform = el.style.transform;
              const backgroundColor = el.style.backgroundColor;
              const color = el.style.color;
              const fontSize = el.style.fontSize;
              
              // Remove all styles first
              el.removeAttribute('style');
              
              // Re-apply preserved styles
              if (textAlign) el.style.textAlign = textAlign;
              if (width) el.style.width = width;
              if (height) el.style.height = height;
              if (transform) el.style.transform = transform;
              if (backgroundColor) el.style.backgroundColor = backgroundColor;
              if (color) el.style.color = color;
              if (fontSize) el.style.fontSize = fontSize;
            }
          });
          
          // Clean up image containers - remove any control buttons
          const imageContainers = tempDiv.querySelectorAll('.image-container');
          imageContainers.forEach((container: any) => {
            // Remove any existing control buttons
            const controlsDiv = container.querySelector('.absolute.top-2.right-2');
            if (controlsDiv) {
              controlsDiv.remove();
            }
            
            // Remove hover-related classes (group, relative) since we don't need them
            container.classList.remove('group', 'relative');
            
            // Ensure basic classes are present
            if (!container.classList.contains('block')) {
              container.classList.add('block', 'my-4', 'text-center');
            }
          });
          
          // Convert [LIBRARY_COMPONENT] text to marker element
          const libraryMarkerText = tempDiv.textContent?.includes('[LIBRARY_COMPONENT]');
          if (libraryMarkerText) {
            const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
            let textNode;
            while (textNode = walker.nextNode()) {
              if (textNode.textContent?.includes('[LIBRARY_COMPONENT]')) {
                const marker = document.createElement('div');
                marker.setAttribute('data-library-marker', 'true');
                marker.className = 'library-component-marker';
                marker.textContent = '[LIBRARY_COMPONENT]';
                marker.style.display = 'block';
                marker.style.minHeight = '50px';
                marker.style.padding = '1rem';
                marker.style.margin = '1rem 0';
                textNode.parentNode?.replaceChild(marker, textNode);
                console.log('🔄 Converted [LIBRARY_COMPONENT] text to marker element');
                break;
              }
            }
          }
          
          htmlContent = tempDiv.innerHTML;
          
          console.log('=== SETTING INNERHTML ===');
          console.log('HTML content length:', htmlContent.length);
          console.log('Current innerHTML length before:', editorRef.current.innerHTML.length);
          
          // Remove the artist favorites container before setting innerHTML (to preserve the React component)
          const artistFavoritesContainer = editorRef.current.querySelector('#artist-favorites-legacy-container') as HTMLElement;
          let savedContainer: HTMLElement | null = null;
          if (artistFavoritesContainer) {
            savedContainer = artistFavoritesContainer;
            artistFavoritesContainer.remove();
            console.log('🔄 Temporarily removed artist favorites container');
          }
          
          editorRef.current.innerHTML = htmlContent;
          
          // Re-append the artist favorites container after setting innerHTML
          if (savedContainer) {
            const favoritesHeading = Array.from(editorRef.current.querySelectorAll('h2')).find(
              h => h.textContent?.includes('Deine 5 Favoriten') || h.textContent?.includes('⭐')
            );
            if (favoritesHeading) {
              let insertAfter = favoritesHeading.nextElementSibling;
              if (insertAfter && insertAfter.tagName === 'P') {
                insertAfter = insertAfter.nextElementSibling;
              }
              if (insertAfter) {
                insertAfter.parentNode?.insertBefore(savedContainer, insertAfter);
              } else {
                favoritesHeading.parentNode?.appendChild(savedContainer);
              }
              console.log('✅ Re-appended artist favorites container (React component preserved)');
            }
          }
          
          console.log('Current innerHTML length after:', editorRef.current.innerHTML.length);
          console.log('=== INNERHTML SET ===');
          
          
          // Replace social embed placeholders with actual embeds
          console.log('Rendering social embeds...');
          renderSocialEmbeds();
          
          // Initialize interact.js on images
          console.log('Initializing interact on images...');
          renderImages();
          
          // Make content blocks draggable
          // console.log('Initializing draggable content blocks...');
          // renderDraggableContent();
          
          // Render release link icon
          console.log('Rendering release link icon...');
          renderReleaseLinkIcon();
          
          // Render dynamic release data fields
          console.log('Rendering dynamic release data fields...');
          renderReleaseDataFields();
          updateDynamicFieldStyling();
          
          // Note: Artist favorites are now handled by TipTap extension
          
          console.log('=== ALL RENDERING COMPLETE ===');
        } else {
          console.log('Skipping innerHTML set - missing requirements');
        }
      }, 100);
    } catch (error) {
      console.error('Error loading release sheet:', error);
      // Redirect back if sheet not found
      if (isTemplate) {
        navigate('/release-sheets?tab=templates');
      } else {
        navigate(`/artist/${artistId}/release-sheets`);
      }
    } finally {
      setLoading(false);
    }
  }, [itemId, navigate, artistId, isTemplate]);

  useEffect(() => {
    if (itemId) {
      loadSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // Real-time subscription for collaborative editing
  useEffect(() => {
    if (!itemId || isTemplate) return; // Only for release sheets, not templates
    
    console.log('🔴 Setting up real-time subscription for sheet:', itemId);
    
    const channel = supabase
      .channel(`release-sheet-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'release_sheets',
          filter: `id=eq.${itemId}`
        },
        (payload) => {
          console.log('🔴 Real-time update received:', payload);
          console.log('🔴 Current time:', new Date().toISOString());
          console.log('🔴 Payload updated_at:', payload.new?.updated_at);
          console.log('🔴 Last saved timestamp:', lastSavedTimestampRef.current);
          
          // Ignore updates that match our last save (this is our own update coming back)
          if (payload.new?.updated_at === lastSavedTimestampRef.current) {
            console.log('🔴 Ignoring own update');
            return;
          }
          
          // Show visual indicator
          setRealtimeUpdate(true);
          setTimeout(() => setRealtimeUpdate(false), 1000);
          
          if (editorRef.current && payload.new) {
            const newContent = payload.new.content;
            
            if (newContent) {
              const htmlContent = newContent.blocks
                ?.map((block: any) => block.content || '')
                .join('<br>') || '';
              
              // Save scroll position
              const scrollTop = editorRef.current.scrollTop;
              const scrollLeft = editorRef.current.scrollLeft;
              
              // Save cursor position if editor is focused
              const selection = window.getSelection();
              let savedRange = null;
              let cursorOffset = 0;
              
              if (document.activeElement === editorRef.current && selection && selection.rangeCount > 0) {
                savedRange = selection.getRangeAt(0);
                // Calculate cursor offset from start
                const preCaretRange = savedRange.cloneRange();
                preCaretRange.selectNodeContents(editorRef.current);
                preCaretRange.setEnd(savedRange.endContainer, savedRange.endOffset);
                cursorOffset = preCaretRange.toString().length;
                console.log('🔴 Saved cursor position:', cursorOffset);
              }
              
              console.log('🔴 Applying real-time update to editor');
              editorRef.current.innerHTML = htmlContent;
              
              // Restore scroll position immediately
              editorRef.current.scrollTop = scrollTop;
              editorRef.current.scrollLeft = scrollLeft;
              
              // Re-render special elements
              renderSocialEmbeds();
              renderImages();
              // renderDraggableContent();
              renderReleaseLinkIcon();
              
              // Restore cursor position if it was saved
              if (savedRange && document.activeElement === editorRef.current) {
                try {
                  const newRange = document.createRange();
                  const sel = window.getSelection();
                  
                  // Find the text node and position
                  const walker = document.createTreeWalker(
                    editorRef.current,
                    NodeFilter.SHOW_TEXT,
                    null
                  );
                  
                  let currentOffset = 0;
                  let targetNode = null;
                  let targetOffset = 0;
                  
                  while (walker.nextNode()) {
                    const node = walker.currentNode;
                    const nodeLength = node.textContent?.length || 0;
                    
                    if (currentOffset + nodeLength >= cursorOffset) {
                      targetNode = node;
                      targetOffset = cursorOffset - currentOffset;
                      break;
                    }
                    currentOffset += nodeLength;
                  }
                  
                  if (targetNode) {
                    newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
                    newRange.collapse(true);
                    sel?.removeAllRanges();
                    sel?.addRange(newRange);
                    console.log('🔴 Restored cursor position');
                  }
                } catch (e) {
                  console.log('🔴 Could not restore cursor position:', e);
                }
              }
              
              // Update sheet state
              setSheet(payload.new as ReleaseSheet);
              setLastSaved(new Date(payload.new.updated_at));
              
              // Update linkedRelease state based on the new data
              if (payload.new.release_id) {
                setLinkedRelease({ id: payload.new.release_id });
              } else {
                setLinkedRelease(null);
              }
              
              // Re-render the link icon to reflect the new state
              setTimeout(() => renderReleaseLinkIcon(), 100);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 Real-time subscription status:', status);
      });
    
    // Cleanup subscription on unmount
    return () => {
      console.log('🔴 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [itemId, isTemplate]);

  // Load artists for the modal
  useEffect(() => {
    const loadArtists = async () => {
      try {
        const { data, error } = await supabase
          .from('artists')
          .select('id, name')
          .order('name');
        
        if (!error && data) {
          setArtists(data.map((a: any) => ({ id: a.id.toString(), name: a.name })));
        }
      } catch (error) {
        console.error('Error loading artists:', error);
      }
    };
    
    loadArtists();
  }, []);

  // Load linked release data and auto-fill information
  useEffect(() => {
    const fetchAndFillReleaseData = async () => {
      if (sheet?.release_id) {
        console.log('🔗 Sheet has release_id:', sheet.release_id);
        setLinkedRelease({ id: sheet.release_id });
        
        // Wait longer for content to be fully loaded and rendered
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch full release data from local database
        try {
          const { data, error } = await supabase
            .from('releases')
            .select(`
              id,
              name,
              release_date,
              artist_id,
              spotify_url,
              master_file_url,
              cover_url,
              artists (
                name,
                instagram_url,
                tiktok_url,
                spotify_url
              )
            `)
            .eq('id', sheet.release_id as any)
            .single();

          if (error) throw error;

          const releaseData = data as any;
          const release = releaseData ? {
            id: releaseData.id,
            title: releaseData.name,
            release_date: releaseData.release_date,
            artist_name: releaseData.artists?.name || '',
            spotify_url: releaseData.spotify_url || '',
            master_file_url: releaseData.master_file_url || '',
            cover_url: releaseData.cover_url || '',
            artist_instagram: releaseData.artists?.instagram_url || '',
            artist_tiktok: releaseData.artists?.tiktok_url || '',
            artist_spotify: releaseData.artists?.spotify_url || ''
          } : null;
          
          console.log('🔗 Found release from local DB:', release?.title);
          
          if (release && editorRef.current) {
            let content = editorRef.current.innerHTML;
            
            // Ensure content is actually loaded
            if (!content || content.length < 50) {
              console.log('⚠️ Content not ready yet, length:', content.length);
              return;
            }
            
            let contentUpdated = false;
            
            // Replace placeholders with actual data
            const placeholders: Record<string, string> = {
              '$releases/name$': release.title,
              '$releases/release_date$': release.release_date ? formatDate(release.release_date) : '',
              '$artists/name$': release.artist_name,
              '$artists/instagram_url$': release.artist_instagram,
              '$artists/tiktok_url$': release.artist_tiktok,
              '$artists/spotify_url$': release.artist_spotify,
              '$releases/spotify_url$': release.spotify_url,
              '$releases/master_file_url$': release.master_file_url
            };
            
            // Replace all placeholders
            Object.entries(placeholders).forEach(([placeholder, value]) => {
              if (value && content.includes(placeholder)) {
                content = content.split(placeholder).join(value);
                contentUpdated = true;
                console.log(`✅ Replaced placeholder ${placeholder} with ${value}`);
              }
            });

            console.log('🔍 Current content length:', content.length);
            console.log('🔍 Release data:', { 
              artist: release.artist_name, 
              title: release.title, 
              date: release.release_date,
              spotify: release.spotify_url || release.artist_spotify,
              instagram: release.artist_instagram,
              tiktok: release.artist_tiktok,
              master: release.master_file_url
            });
            console.log('🔍 Content preview (first 500 chars):', content.substring(0, 500));

            // Auto-fill artist name - check multiple patterns
            if (release.artist_name) {
              console.log('🎤 Attempting to auto-fill artist name:', release.artist_name);
              
              // Check if artist name is already filled
              const hasArtistName = content.includes(release.artist_name) && 
                                   (content.includes('👤') || content.toLowerCase().includes('artist'));
              
              if (!hasArtistName) {
                // Try multiple patterns - be very flexible
                const artistPatterns = [
                  /(👤[^:]*Artist[^:]*:?\s*)(<[^>]*>)*(\s|&nbsp;|<br[^>]*>)*/gi,
                  /(Artist[^:]*:?\s*)(<[^>]*>)*(\s|&nbsp;|<br[^>]*>)*/gi
                ];
                
                for (const pattern of artistPatterns) {
                  const matches = content.match(pattern);
                  if (matches) {
                    console.log('🔍 Found artist pattern:', matches[0]);
                    content = content.replace(pattern, `$1 ${release.artist_name}<br><br>`);
                    contentUpdated = true;
                    console.log('✅ Artist name filled');
                    break;
                  }
                }
                if (!contentUpdated) {
                  console.log('⚠️ No artist pattern found in content');
                }
              } else {
                console.log('ℹ️ Artist name already present');
              }
            }

            // Auto-fill song name - check multiple patterns
            if (release.title) {
              console.log('🎵 Attempting to auto-fill song name:', release.title);
              
              // Check if song name is already filled
              const hasSongName = content.includes(release.title) && 
                                 (content.includes('🎵') || content.toLowerCase().includes('songname'));
              
              if (!hasSongName) {
                // Simple approach: find "Songname:" and add the value after it
                const songnameIndex = content.search(/Songname\s*:/i);
                if (songnameIndex !== -1) {
                  console.log('🔍 Found Songname at index:', songnameIndex);
                  // Find the end of "Songname:" including any whitespace and HTML tags
                  const afterLabel = content.substring(songnameIndex);
                  const colonMatch = afterLabel.match(/Songname\s*:\s*(<[^>]*>|\s|&nbsp;)*/i);
                  if (colonMatch) {
                    const insertPos = songnameIndex + colonMatch[0].length;
                    content = content.substring(0, insertPos) + ` ${release.title}` + content.substring(insertPos);
                    contentUpdated = true;
                    console.log('✅ Song name filled at position', insertPos);
                  }
                } else {
                  console.log('⚠️ Songname label not found in content');
                }
              } else {
                console.log('ℹ️ Song name already present');
              }
            }

            // Auto-fill release date if found
            if (release.release_date) {
              const dateStr = new Date(release.release_date).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
              
              console.log('📅 Attempting to auto-fill release date:', dateStr);
              
              // Check if date is already filled (look for the formatted date near Release Date text)
              const hasReleaseDate = content.includes(dateStr) && 
                                    (content.includes('📆') || content.toLowerCase().includes('release date'));
              
              if (!hasReleaseDate) {
                // Simple approach: find "Release Date:" and add the value after it
                const releaseDateIndex = content.search(/Release\s+Date\s*:/i);
                if (releaseDateIndex !== -1) {
                  console.log('🔍 Found Release Date at index:', releaseDateIndex);
                  const afterLabel = content.substring(releaseDateIndex);
                  const colonMatch = afterLabel.match(/Release\s+Date\s*:\s*(<[^>]*>|\s|&nbsp;)*/i);
                  if (colonMatch) {
                    const insertPos = releaseDateIndex + colonMatch[0].length;
                    content = content.substring(0, insertPos) + ` ${dateStr}` + content.substring(insertPos);
                    contentUpdated = true;
                    console.log('✅ Release date filled at position', insertPos);
                  }
                } else {
                  console.log('⚠️ Release Date label not found in content');
                }
              } else {
                console.log('ℹ️ Release date already present');
              }
            }

            // Auto-fill Master file
            if (release.master_file_url) {
              console.log('📁 Attempting to auto-fill master file:', release.master_file_url);
              const hasMaster = content.includes(release.master_file_url);
              
              if (!hasMaster) {
                const masterPatterns = [
                  /(📁\s*Master:?\s*)(<[^>]*>)*(\s|&nbsp;)*(\([^)]*\))?(\s|&nbsp;)*/i,
                  /(Master:?\s*)(<[^>]*>)*(\s|&nbsp;)*(\([^)]*\))?(\s|&nbsp;)*/i
                ];
                
                for (const pattern of masterPatterns) {
                  if (pattern.test(content)) {
                    content = content.replace(pattern, `$1 ${release.master_file_url}<br><br>`);
                    contentUpdated = true;
                    console.log('✅ Master file filled');
                    break;
                  }
                }
              }
            }

            // Auto-fill TikTok URL
            if (release.artist_tiktok) {
              console.log('📱 Attempting to auto-fill TikTok:', release.artist_tiktok);
              const hasTikTok = content.includes(release.artist_tiktok);
              
              if (!hasTikTok) {
                const tiktokIndex = content.search(/TikTok\s*:/i);
                if (tiktokIndex !== -1) {
                  console.log('🔍 Found TikTok at index:', tiktokIndex);
                  const afterLabel = content.substring(tiktokIndex);
                  const colonMatch = afterLabel.match(/TikTok\s*:\s*(<[^>]*>|\s|&nbsp;)*(\([^)]*\))?\s*/i);
                  if (colonMatch) {
                    const insertPos = tiktokIndex + colonMatch[0].length;
                    content = content.substring(0, insertPos) + ` ${release.artist_tiktok}` + content.substring(insertPos);
                    contentUpdated = true;
                    console.log('✅ TikTok URL filled at position', insertPos);
                  }
                } else {
                  console.log('⚠️ TikTok label not found in content');
                }
              }
            }

            // Auto-fill Instagram URL
            if (release.artist_instagram) {
              console.log('📸 Attempting to auto-fill Instagram:', release.artist_instagram);
              const hasInstagram = content.includes(release.artist_instagram);
              
              if (!hasInstagram) {
                const instagramIndex = content.search(/Instagram\s*:/i);
                if (instagramIndex !== -1) {
                  console.log('🔍 Found Instagram at index:', instagramIndex);
                  const afterLabel = content.substring(instagramIndex);
                  const colonMatch = afterLabel.match(/Instagram\s*:\s*(<[^>]*>|\s|&nbsp;)*(\([^)]*\))?\s*/i);
                  if (colonMatch) {
                    const insertPos = instagramIndex + colonMatch[0].length;
                    content = content.substring(0, insertPos) + ` ${release.artist_instagram}` + content.substring(insertPos);
                    contentUpdated = true;
                    console.log('✅ Instagram URL filled at position', insertPos);
                  }
                } else {
                  console.log('⚠️ Instagram label not found in content');
                }
              }
            }

            // Auto-fill Spotify URL (use artist spotify only, not release spotify to avoid duplication)
            const spotifyUrl = release.artist_spotify;
            if (spotifyUrl) {
              console.log('🎶 Attempting to auto-fill Spotify:', spotifyUrl);
              const hasSpotify = content.includes(spotifyUrl);
              
              if (!hasSpotify) {
                const spotifyIndex = content.search(/Spotify\s*:/i);
                if (spotifyIndex !== -1) {
                  console.log('🔍 Found Spotify at index:', spotifyIndex);
                  const afterLabel = content.substring(spotifyIndex);
                  const colonMatch = afterLabel.match(/Spotify\s*:\s*(<[^>]*>|\s|&nbsp;)*(\([^)]*\))?\s*/i);
                  if (colonMatch) {
                    const insertPos = spotifyIndex + colonMatch[0].length;
                    content = content.substring(0, insertPos) + ` ${spotifyUrl}` + content.substring(insertPos);
                    contentUpdated = true;
                    console.log('✅ Spotify URL filled at position', insertPos);
                  }
                } else {
                  console.log('⚠️ Spotify label not found in content');
                }
              }
            }

            // Apply all content updates at once
            if (contentUpdated) {
              console.log('✅ Applying all auto-filled data to editor');
              editorRef.current.innerHTML = content;
              
              // Update sheet state with replaced content so Novel editor shows it
              setSheet(prev => prev ? {
                ...prev,
                content: {
                  blocks: [{
                    id: 'main-content',
                    type: 'paragraph',
                    content: content
                  }]
                }
              } : null);
              
              // Re-render dynamic fields with updated styling
              setTimeout(() => {
                renderReleaseDataFields();
                updateDynamicFieldStyling();
              }, 100);
              
              scheduleAutoSave();
            } else {
              console.log('ℹ️ No fields needed auto-filling');
            }
          }
          
          // Re-render the link icon to show linked state
          setTimeout(() => renderReleaseLinkIcon(), 300);
        } catch (error) {
          console.error('Error fetching release data:', error);
        }
      } else {
        console.log('🔗 No release_id, setting linkedRelease to null');
        setLinkedRelease(null);
        // Re-render the link icon to show unlinked state
        setTimeout(() => renderReleaseLinkIcon(), 300);
      }
    };
    
    fetchAndFillReleaseData();
  }, [sheet?.release_id]);

  // Unlink release from sheet
  const handleUnlink = async () => {
    if (!sheet) return;
    
    if (!confirm('Are you sure you want to unlink this release? This will not delete the release sheet.')) {
      return;
    }
    
    try {
      const updated = await ReleaseService.updateReleaseSheet(sheet.id, {
        release_id: null,
        release_title: null
      });
      
      // Store the timestamp to ignore this update in real-time
      if (updated?.updated_at) {
        lastSavedTimestampRef.current = updated.updated_at;
        console.log('💾 Unlinked with timestamp:', updated.updated_at);
      }
      
      setSheet(updated);
      setLinkedRelease(null);
      
      // Re-render the link icon to show unlinked state
      setTimeout(() => renderReleaseLinkIcon(), 100);
    } catch (error) {
      console.error('Error unlinking release:', error);
      alert('Failed to unlink release');
    }
  };




  const handleTitleChange = (title: string) => {
    if (!sheet) return;
    setSheet(prev => prev ? { ...prev, title } : null);
    scheduleAutoSave();
  };

  const handleContentChange = (htmlContent?: string) => {
    if (!sheet) return;
    
    const htmlString = htmlContent || editorRef.current?.innerHTML || '';
    
    // Don't clean up content during typing - only save as-is
    // Cleanup will happen on load/paste if needed
    const content = {
      blocks: [{
        id: 'main-content',
        type: 'paragraph',
        content: htmlString
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
    
    // Schedule new save after 500ms for faster real-time collaboration
    saveTimeoutRef.current = setTimeout(() => {
      saveSheet();
    }, 500);
  };

  const saveSheet = async () => {
    if (!sheet || saving) return;

    try {
      setSaving(true);
      
      if (isTemplate) {
        // Save to templates table
        await (supabase as any)
          .from('release_sheet_templates')
          .update({
            name: sheet.title,
            content: sheet.content,
            locked_nodes: lockedNodes,
            updated_at: new Date().toISOString()
          })
          .eq('id', sheet.id);
      } else {
        // Save to release sheets table
        const updated = await ReleaseService.updateReleaseSheet(sheet.id, {
          title: sheet.title,
          content: sheet.content,
          status: sheet.status,
          due_date: sheet.due_date,
          tags: sheet.tags
        });
        
        // Store the timestamp of this save to ignore it in real-time updates
        if (updated?.updated_at) {
          lastSavedTimestampRef.current = updated.updated_at;
          console.log('💾 Saved with timestamp:', updated.updated_at);
        }
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
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

  const deleteReleaseSheet = async () => {
    if (!sheet) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${sheet.title}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      if (isTemplate) {
        // Delete template
        const { error } = await (supabase as any)
          .from('release_sheet_templates')
          .delete()
          .eq('id', sheet.id);
        
        if (error) throw error;
        alert('Template deleted successfully!');
        navigate('/release-sheets?tab=templates');
      } else {
        // Delete release sheet
        const { error } = await (supabase as any)
          .from('release_sheets')
          .delete()
          .eq('id', sheet.id);
        
        if (error) throw error;
        alert('Release sheet deleted successfully!');
        navigate(fromAdmin ? '/release-sheets' : `/artist/${artistId}/release-sheets`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const saveAsTemplate = async () => {
    if (!sheet || !editorRef.current || !artistId) return;
    
    const templateName = prompt('Enter template name:', 'Release Sheet Template (DE)');
    if (!templateName) return;
    
    try {
      // Get current content
      const currentContent = editorRef.current.innerHTML;
      
      // Create template object
      const template = {
        name: templateName,
        description: `Template created from "${sheet.title}"`,
        language: 'de',
        content: { html: currentContent },
        created_by_artist_id: artistId,
        is_public: false,
        tags: ['german', 'release-sheet']
      };
      
      // Save to database using raw SQL to avoid type issues
      const { error } = await supabase.rpc('insert_release_sheet_template', {
        template_data: template
      });
      
      if (error) {
        console.error('Error saving template:', error);
        alert('Failed to save template. Please try again.');
        return;
      }
      
      alert(`Template "${templateName}" saved successfully!`);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('An error occurred while saving the template.');
    }
  };

  // Image upload functions







  // Social media URL detection
  // Initialize interact.js for draggable and resizable elements
  const initializeInteract = (element: Element) => {
    const htmlElement = element as HTMLElement;
    
    // Skip if already initialized
    if ((htmlElement as any)._interactInitialized) return;
    
    // Never make the editor container itself draggable
    if (htmlElement === editorRef.current || htmlElement.classList.contains('editor-container')) return;
    
    (htmlElement as any)._interactInitialized = true;
    
    // Make element position relative if not already
    if (!htmlElement.style.position || htmlElement.style.position === 'static') {
      htmlElement.style.position = 'relative';
    }
    
    // Initialize interact.js
    interact(htmlElement)
      .draggable({
        listeners: {
          start(event) {
            const target = event.target as HTMLElement;
            target.style.cursor = 'grabbing';
            target.style.zIndex = '1000';
          },
          move(event) {
            const target = event.target as HTMLElement;
            const x = (parseFloat(target.getAttribute('data-x') || '0')) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y') || '0')) + event.dy;
            
            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x.toString());
            target.setAttribute('data-y', y.toString());
          },
          end(event) {
            const target = event.target as HTMLElement;
            target.style.cursor = 'grab';
            target.style.zIndex = '';
            handleContentChange();
          }
        },
        modifiers: [
          interact.modifiers.restrict({
            restriction: 'parent',
            endOnly: true
          })
        ]
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const target = event.target as HTMLElement;
            let x = parseFloat(target.getAttribute('data-x') || '0');
            let y = parseFloat(target.getAttribute('data-y') || '0');
            
            // Update the element's style
            target.style.width = `${event.rect.width}px`;
            target.style.height = `${event.rect.height}px`;
            
            // Translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;
            
            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x.toString());
            target.setAttribute('data-y', y.toString());
          },
          end() {
            handleContentChange();
          }
        },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 }
          })
        ]
      })
      .styleCursor(false);
    
    // Add visual indicator that element is draggable
    htmlElement.style.cursor = 'grab';
    htmlElement.style.border = '2px dashed transparent';
    htmlElement.style.transition = 'border-color 0.2s';
    
    // Show border on hover
    htmlElement.addEventListener('mouseenter', () => {
      htmlElement.style.borderColor = '#3b82f6';
    });
    htmlElement.addEventListener('mouseleave', () => {
      htmlElement.style.borderColor = 'transparent';
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
        // Initialize interact.js for drag and resize
        initializeInteract(container);
        
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
      const htmlElement = container as HTMLElement;
      
      // Remove any drag-related styling and classes
      htmlElement.classList.remove('draggable-block');
      htmlElement.style.cursor = '';
      htmlElement.style.border = '';
      htmlElement.style.transition = '';
      htmlElement.style.position = '';
      
      // Remove interact.js if it was initialized
      if ((htmlElement as any)._interactInitialized) {
        interact(htmlElement).unset();
        (htmlElement as any)._interactInitialized = false;
      }
      
      // Initialize interact.js for drag and resize
      // Disabled for now - images should not be draggable
      // initializeInteract(container);
    });
  };

  const renderReleaseDataFields = () => {
    if (!editorRef.current) return;
    
    console.log('📋 renderReleaseDataFields called');
    
    // Define field configurations
    const fieldConfigs = [
      { emoji: '🎵', pattern: /🎵\s*Songname:?/i, type: 'songname', label: 'Songname' },
      { emoji: '📆', pattern: /📆\s*Release Date:?/i, type: 'release_date', label: 'Release Date' },
      { emoji: '💿', pattern: /💿\s*Artist-Genre:?/i, type: 'artist_genre', label: 'Artist-Genre' },
      { emoji: '💿', pattern: /💿\s*Song-Genre:?/i, type: 'song_genre', label: 'Song-Genre' },
      { emoji: '📁', pattern: /📁\s*Master:?/i, type: 'master', label: 'Master' },
      { emoji: '📀', pattern: /📀\s*Snippet:?/i, type: 'snippet', label: 'Snippet' },
      { emoji: '📱', pattern: /📱\s*TikTok:?/i, type: 'tiktok', label: 'TikTok' },
      { emoji: '📸', pattern: /📸\s*Instagram:?/i, type: 'instagram', label: 'Instagram' },
      { emoji: '🎶', pattern: /🎶\s*Spotify:?/i, type: 'spotify', label: 'Spotify' }
    ];

    // Find and enhance each field
    fieldConfigs.forEach(config => {
      const walker = document.createTreeWalker(
        editorRef.current!,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent || '';
        if (config.pattern.test(text)) {
          const parent = node.parentElement;
          if (parent && !parent.querySelector('.release-data-field-marker')) {
            // Add a marker to prevent duplicate processing
            const marker = document.createElement('span');
            marker.className = 'release-data-field-marker';
            marker.style.display = 'none';
            marker.setAttribute('data-field-type', config.type);
            parent.appendChild(marker);
            
            // Add styling to make it look like a dynamic field
            parent.style.padding = '8px 12px';
            parent.style.margin = '8px 0';
            parent.style.borderRadius = '8px';
            parent.style.border = '2px dashed #d1d5db';
            parent.style.backgroundColor = '#f9fafb';
            parent.style.transition = 'all 0.2s';
          }
          break;
        }
      }
    });
  };

  const updateDynamicFieldStyling = () => {
    if (!editorRef.current) return;
    
    console.log('🎨 Updating dynamic field styling');
    
    // Find all marked fields and update their styling based on content
    const markers = editorRef.current.querySelectorAll('.release-data-field-marker');
    markers.forEach(marker => {
      const parent = marker.parentElement;
      if (!parent) return;
      
      const text = parent.textContent || '';
      const fieldType = marker.getAttribute('data-field-type');
      
      // Check if field has data (more than just the label)
      const hasData = text.split(':').length > 1 && text.split(':')[1].trim().length > 0;
      
      if (hasData) {
        // Field is filled - show green border and background
        parent.style.border = '2px solid #10b981';
        parent.style.backgroundColor = '#ecfdf5';
        console.log(`✅ Field ${fieldType} is filled`);
      } else {
        // Field is empty - show gray dashed border
        parent.style.border = '2px dashed #d1d5db';
        parent.style.backgroundColor = '#f9fafb';
        console.log(`⚪ Field ${fieldType} is empty`);
      }
    });
  };

  const renderReleaseLinkIcon = () => {
    if (!editorRef.current || isTemplate) return;
    
    console.log('🔗 renderReleaseLinkIcon called');
    console.log('🔗 linkedRelease state:', linkedRelease);
    console.log('🔗 sheet.release_id:', sheet?.release_id);
    
    // Remove any existing link icons first
    const existingIcons = editorRef.current.querySelectorAll('.release-link-icon');
    console.log('🔗 Removing', existingIcons.length, 'existing icons');
    existingIcons.forEach(icon => icon.remove());
    
    // Find the song name line (look for text containing "Songname:" or "🎵")
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      // Look for patterns like "🎵 Songname:" or "Songname:"
      if (text.match(/🎵.*Songname:|Songname:/i)) {
        console.log('🔗 Found songname pattern, linkedRelease:', linkedRelease);
        // Find the parent element
        let parent = node.parentElement;
        if (parent) {
          // Create the icon element
          const iconSpan = document.createElement('span');
          iconSpan.className = 'release-link-icon inline-flex items-center ml-2';
          iconSpan.contentEditable = 'false';
          iconSpan.style.cursor = 'pointer';
          iconSpan.style.verticalAlign = 'middle';
          
          const svgIcon = linkedRelease 
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline" style="color: #16a34a;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline" style="color: #9ca3af;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
          
          console.log('🔗 Rendering icon with color:', linkedRelease ? 'green' : 'gray');
          
          iconSpan.innerHTML = svgIcon;
          iconSpan.title = linkedRelease 
            ? `Linked to Release ID: ${linkedRelease.id} (Click to unlink)` 
            : 'Click to link release';
          
          // Add click handler
          iconSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (linkedRelease) {
              handleUnlink();
            } else {
              setShowEditModal(true);
            }
          });
          
          // Insert after the parent element's last child
          parent.appendChild(iconSpan);
          break; // Only add one icon
        }
      }
    }
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

  // Set up MutationObserver to make new content draggable
  // useEffect(() => {
  //   if (!editorRef.current) return;

  //   const observer = new MutationObserver((mutations) => {
  //     // Debounce the draggable rendering to avoid too many calls
  //     let needsUpdate = false;
      
  //     mutations.forEach((mutation) => {
  //       if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
  //         mutation.addedNodes.forEach((node) => {
  //           if (node.nodeType === Node.ELEMENT_NODE) {
  //             const element = node as HTMLElement;
  //             // Check if it's a block-level element
  //             if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'HR'].includes(element.tagName)) {
  //               needsUpdate = true;
  //             }
  //           }
  //         });
  //       }
  //     });

  //     if (needsUpdate) {
  //       // Use a small timeout to batch updates
  //       setTimeout(() => {
  //         renderDraggableContent();
  //       }, 100);
  //     }
  //   });

  //   observer.observe(editorRef.current, {
  //     childList: true,
  //     subtree: false // Only watch direct children
  //   });

  //   return () => {
  //     observer.disconnect();
  //   };
  // }, []);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#000000]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#000000]">
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
    <div className="min-h-screen bg-white dark:bg-[#000000]">
      {/* Custom styles for editor links */}
      <style>{`
        .editor-links a {
          color: #3b82f6 !important;
          text-decoration: underline !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 1px !important;
          text-underline-offset: 2px !important;
          cursor: pointer !important;
          word-break: break-all !important;
        }
        .editor-links a:hover {
          color: #2563eb !important;
          text-decoration-thickness: 2px !important;
        }
        .dark .editor-links a {
          color: #60a5fa !important;
        }
        .dark .editor-links a:hover {
          color: #93c5fd !important;
        }
      `}</style>
      
      {/* Combined Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-sm">
        {/* Sheet Title */}
        <div className="mx-auto py-4" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <div className="flex items-center space-x-4">
            <Link 
              to={backPath}
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
          <div className="flex flex-wrap items-center justify-between mt-4" style={{ display: 'none' }}>
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
              <button 
                onClick={() => formatBlock('p')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" 
                title="Paragraph"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pilcrow h-4 w-4">
                  <path d="M13 4v16"></path>
                  <path d="M17 4v16"></path>
                  <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"></path>
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
            
            {/* Undo/Redo and Version History Buttons */}
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
              {fromAdmin && (
                <div className="border-l border-gray-200 dark:border-gray-700 ml-2 pl-2 flex items-center gap-2">
                  {isTemplate ? (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                      Template
                    </span>
                  ) : (
                    <>
                      <button 
                        onClick={saveAsTemplate}
                        className="p-2 hover:bg-green-100 dark:hover:bg-green-700 rounded transition-colors text-green-600 dark:text-green-400" 
                        title="Save as Template"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14,2 14,8 20,8"></polyline>
                          <line x1="16" x2="8" y1="13" y2="13"></line>
                          <line x1="16" x2="8" y1="17" y2="17"></line>
                          <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                      </button>
                      <button 
                        onClick={deleteReleaseSheet}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-700 rounded transition-colors text-red-600 dark:text-red-400" 
                        title="Delete Release Sheet"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      <div className="fixed top-4 right-4 z-50">
        {realtimeUpdate && (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm flex items-center space-x-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span>Synced</span>
          </div>
        )}
        {saving && (
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
            <span>Saving...</span>
          </div>
        )}
        {lastSaved && !saving && !realtimeUpdate && (
          <div className="flex items-center gap-2">
            <div 
              onClick={() => {
                console.log('💾 Manual save triggered');
                scheduleAutoSave();
              }}
              className="text-white opacity-50 px-3 py-1 rounded-full text-sm hover:opacity-100 transition-opacity cursor-pointer group relative"
              title={`Click to save now • Last saved ${lastSaved.toLocaleTimeString()}`}
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
                Click to save now • Last saved {lastSaved.toLocaleTimeString()}
              </div>
            </div>
            
            {/* Version History Dropdown */}
            {!isTemplate && itemId && (
              <VersionHistoryDropdown 
                releaseSheetId={itemId} 
                onRestore={loadSheet}
              />
            )}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="mx-auto max-w-5xl px-8" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {sheet && sheet.content && editorData && (
          <EditorJSWrapper
            key={sheet.id}
            data={editorData}
            onChange={(data) => {
              console.log('💾 Editor.js data changed:', data);
              setEditorData(data);
              
              // Convert to HTML and save
              const html = editorJSToHTML(data);
              if (editorRef.current) {
                editorRef.current.innerHTML = html;
              }
              handleContentChange(html);
            }}
            artistId={artistId}
            releaseDate={linkedRelease?.release_date}
            placeholder={isTemplate ? 'Type / for commands... Use $table/field$ for placeholders' : 'Type / for commands...'}
            readOnly={false}
          />
        )}
        {/* Hidden div to maintain compatibility with existing save logic */}
        <div
          ref={editorRef}
          style={{ display: 'none' }}
          suppressContentEditableWarning={true}
        >
        </div>
      </div>

      <style>{`
        /* Ensure editor container itself is never draggable */
        .editor-container {
          cursor: text !important;
          border: none !important;
          position: static !important;
        }
        
        .editor-container:hover {
          border: none !important;
        }
        
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
        
        [contenteditable] * {
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        [contenteditable]:focus {
          outline: none;
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

      {/* Edit Modal for linking release */}
      {showEditModal && sheet && (
        <ReleaseSheetEditModal
          sheet={sheet}
          artists={artists}
          loadReleases={async () => {
            // Load all releases - filtering will be added when artist_id is available in Release interface
            return await ReleaseService.getReleases();
          }}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            // Store the timestamp to ignore this update in real-time
            if (updated?.updated_at) {
              lastSavedTimestampRef.current = updated.updated_at;
              console.log('💾 Linked with timestamp:', updated.updated_at);
            }
            
            setSheet(updated);
            setShowEditModal(false);
            // Reload sheet to get updated data
            loadSheet();
            // Re-render the link icon to show linked state
            setTimeout(() => renderReleaseLinkIcon(), 200);
          }}
          onUpdate={async (id, updates) => {
            return await ReleaseService.updateReleaseSheet(id, updates);
          }}
        />
      )}

      {/* Placeholder helper for templates */}
      {isTemplate && <PlaceholderHelper />}
    </div>
  );
};
