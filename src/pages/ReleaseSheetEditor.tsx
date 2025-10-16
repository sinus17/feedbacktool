import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Undo, Redo, Trash2 } from 'lucide-react';
import interact from 'interactjs';
import { ReleaseService, ReleaseSheet } from '../services/releaseService';
import { SocialEmbed } from '../components/SocialEmbed';
import { ReleaseSheetEditModal } from '../components/ReleaseSheetEditModal';
import { VersionHistoryDropdown } from '../components/VersionHistoryDropdown';
import { SimpleNovelEditor } from '../components/SimpleNovelEditor';
import type { JSONContent } from 'novel';
import { supabase } from '../lib/supabase';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [linkedRelease, setLinkedRelease] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [realtimeUpdate, setRealtimeUpdate] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimestampRef = useRef<string | null>(null);

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
          
          htmlContent = tempDiv.innerHTML;
          
          console.log('=== SETTING INNERHTML ===');
          console.log('HTML content length:', htmlContent.length);
          console.log('Current innerHTML length before:', editorRef.current.innerHTML.length);
          
          editorRef.current.innerHTML = htmlContent;
          
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
  }, [itemId, loadSheet]);

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
        
        // Wait a bit for content to be loaded
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Fetch full release data from reporting database
        try {
          const releases = await ReleaseService.getReleases();
          const release = releases.find(r => r.id === sheet.release_id);
          
          console.log('🔗 Found release:', release?.title);
          
          if (release && editorRef.current) {
            // Auto-fill release date if found
            if (release.release_date) {
              const dateStr = new Date(release.release_date).toLocaleDateString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
              
              console.log('📅 Auto-filling release date:', dateStr);
              
              // Find and update the Release Date field in the editor
              let content = editorRef.current.innerHTML;
              
              // First, check if the date is already there to avoid duplicates
              if (content.includes(`📆 Release Date: ${dateStr}`) || 
                  content.includes(`📆&nbsp;Release Date:&nbsp;${dateStr}`)) {
                console.log('📅 Release date already present, skipping');
                return;
              }
              
              // Remove any existing dates after "Release Date:" to clean up duplicates
              content = content.replace(
                /(📆[^>]*Release Date:[^<]*<[^>]*>)([^<]*<br[^>]*>[^<]*<br[^>]*>)*/gi,
                '$1'
              );
              
              // Now add the date once
              const updatedContent = content.replace(
                /(📆\s*Release Date:?\s*)(<[^>]*>)*(\s|&nbsp;)*/i,
                `$1 ${dateStr}<br><br>`
              );
              
              if (content !== updatedContent) {
                console.log('📅 Updating content with release date');
                editorRef.current.innerHTML = updatedContent;
                scheduleAutoSave();
              } else {
                console.log('📅 Content already has release date or pattern not found');
              }
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

  const handleContentChange = () => {
    if (!sheet || !editorRef.current) return;
    
    const htmlContent = editorRef.current.innerHTML;
    
    // Don't clean up content during typing - only save as-is
    // Cleanup will happen on load/paste if needed
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

  // Convert HTML to Novel JSON format
  const htmlToNovelJson = (html: string): JSONContent => {
    if (!html || html.trim() === '') {
      return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      };
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const content: any[] = [];

    const parseNode = (node: Node): any => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          return { type: 'text', text };
        }
        return null;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'p') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean).flat();
          return { type: 'paragraph', content: childContent.length > 0 ? childContent : [] };
        }
        if (tagName === 'h1') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean).flat();
          return { type: 'heading', attrs: { level: 1 }, content: childContent };
        }
        if (tagName === 'h2') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean).flat();
          return { type: 'heading', attrs: { level: 2 }, content: childContent };
        }
        if (tagName === 'h3') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean).flat();
          return { type: 'heading', attrs: { level: 3 }, content: childContent };
        }
        if (tagName === 'strong' || tagName === 'b') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean);
          return childContent.map(c => ({ ...c, marks: [...(c.marks || []), { type: 'bold' }] }));
        }
        if (tagName === 'em' || tagName === 'i') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean);
          return childContent.map(c => ({ ...c, marks: [...(c.marks || []), { type: 'italic' }] }));
        }
        if (tagName === 'u') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean);
          return childContent.map(c => ({ ...c, marks: [...(c.marks || []), { type: 'underline' }] }));
        }
        if (tagName === 'div') {
          const childContent = Array.from(element.childNodes).map(parseNode).filter(Boolean).flat();
          return { type: 'paragraph', content: childContent.length > 0 ? childContent : [] };
        }
        if (tagName === 'img') {
          return { type: 'image', attrs: { src: element.getAttribute('src'), alt: element.getAttribute('alt') } };
        }
      }

      return null;
    };

    Array.from(tempDiv.childNodes).forEach((node) => {
      const parsed = parseNode(node);
      if (parsed) {
        if (Array.isArray(parsed)) {
          content.push(...parsed);
        } else {
          content.push(parsed);
        }
      }
    });

    if (content.length === 0) {
      content.push({ type: 'paragraph', content: [] });
    }

    return { type: 'doc', content };
  };

  // Convert Novel JSON to HTML
  const novelJsonToHtml = (json: JSONContent): string => {
    if (!json || !json.content) return '';

    const renderNode = (node: any): string => {
      if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            if (mark.type === 'bold') text = `<strong>${text}</strong>`;
            if (mark.type === 'italic') text = `<em>${text}</em>`;
            if (mark.type === 'underline') text = `<u>${text}</u>`;
          });
        }
        return text;
      }

      if (node.type === 'paragraph') {
        const content = node.content?.map(renderNode).join('') || '';
        return `<p>${content}</p>`;
      }

      if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const content = node.content?.map(renderNode).join('') || '';
        return `<h${level}>${content}</h${level}>`;
      }

      if (node.type === 'image') {
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        return `<img src="${src}" alt="${alt}" />`;
      }

      return '';
    };

    return json.content.map(renderNode).join('');
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
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
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
        {sheet && sheet.content && (
          <SimpleNovelEditor
            key={`${sheet.id}-${sheet.updated_at}`} // Force re-render when sheet or content changes
            initialContent={(() => {
              // Get all blocks and join them
              const blocks = sheet.content?.blocks || [];
              const htmlContent = blocks
                .map((block: any) => block.content || '')
                .join('');
              
              console.log('📄 Loading content for sheet:', sheet.id);
              console.log('📄 Number of blocks:', blocks.length);
              console.log('📄 HTML content length:', htmlContent?.length);
              console.log('📄 HTML content preview:', htmlContent?.substring(0, 300));
              
              if (htmlContent && htmlContent.trim()) {
                const json = htmlToNovelJson(htmlContent);
                console.log('📄 Converted to JSON:', JSON.stringify(json, null, 2));
                return json;
              }
              
              console.log('⚠️ No content found, using empty document');
              return {
                type: 'doc',
                content: [{ type: 'paragraph', content: [] }],
              };
            })()}
            onChange={(json) => {
              if (!sheet || !editorRef.current) return;
              // Convert JSON back to HTML and update the hidden div
              const html = novelJsonToHtml(json);
              console.log('💾 Saving HTML:', html?.substring(0, 200));
              editorRef.current.innerHTML = html;
              handleContentChange();
            }}
            onBlur={handleEditorBlur}
            editable={true}
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
    </div>
  );
};
