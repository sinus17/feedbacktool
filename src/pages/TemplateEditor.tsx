import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Undo, Redo } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Template {
  id: string;
  name: string;
  content: any;
  language: string;
  created_at: string;
  updated_at: string;
}

export const TemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      console.log('Loading template:', templateId);
      const query: any = supabase
        .from('release_sheet_templates')
        .select('*');
      const { data, error } = await query.eq('id', templateId).single();
      
      if (error) throw error;
      const templateData = data as unknown as Template;
      console.log('Template loaded:', templateData);
      console.log('Template content:', templateData.content);
      setTemplate(templateData);
      
      // Initialize editor content after template loads
      setTimeout(() => {
        if (editorRef.current && templateData && templateData.content) {
          const htmlContent = templateData.content.blocks
            ?.map((block: any) => block.content || '')
            .join('<br>') || '';
          console.log('Setting editor HTML:', htmlContent);
          editorRef.current.innerHTML = htmlContent;
          
          // Replace audio player placeholders with actual players
          renderAudioPlayers();
          
          // Replace social embed placeholders with actual embeds
          renderSocialEmbeds();
        }
      }, 100);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const renderAudioPlayers = () => {
    if (!editorRef.current) return;
    
    const placeholders = editorRef.current.querySelectorAll('[data-audio-url]');
    placeholders.forEach((placeholder) => {
      const audioUrl = placeholder.getAttribute('data-audio-url');
      if (audioUrl) {
        const container = document.createElement('div');
        container.className = 'audio-player-container';
        placeholder.parentNode?.replaceChild(container, placeholder);
      }
    });
  };

  const renderSocialEmbeds = () => {
    if (!editorRef.current) return;
    
    const placeholders = editorRef.current.querySelectorAll('[data-social-url]');
    placeholders.forEach((placeholder) => {
      const socialUrl = placeholder.getAttribute('data-social-url');
      const platform = placeholder.getAttribute('data-platform');
      if (socialUrl && platform) {
        const container = document.createElement('div');
        container.className = 'social-embed-container';
        placeholder.parentNode?.replaceChild(container, placeholder);
      }
    });
  };

  const saveTemplate = async () => {
    if (!editorRef.current || !template) {
      console.log('Cannot save: editorRef or template is null');
      return;
    }

    try {
      setSaving(true);
      
      const content = editorRef.current.innerHTML;
      const blocks = [{ type: 'html', content }];

      console.log('Saving template with content:', { blocks, templateId: template.id });
      console.log('Actual HTML content being saved:', content);

      const query: any = supabase
        .from('release_sheet_templates')
        .update({
          content: { blocks },
          updated_at: new Date().toISOString()
        } as any);
      
      const result = await query.eq('id', template.id);
      
      console.log('Full save result:', result);
      
      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }
      
      console.log('Save successful!');
      console.log('Response data:', result.data);
      console.log('Status:', result.status);
      console.log('StatusText:', result.statusText);
      
      setLastSaved(new Date());
      setTemplate({ ...template, content: { blocks } });
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = () => {
    console.log('Editor content changed, scheduling save...');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      console.log('Auto-saving template...');
      saveTemplate();
    }, 1000);
  };

  const undoAction = () => {
    document.execCommand('undo', false);
  };

  const redoAction = () => {
    document.execCommand('redo', false);
  };

  const setTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    setShowColorPicker(false);
    editorRef.current?.focus();
  };

  const setTextSize = (size: string) => {
    document.execCommand('fontSize', false, size);
    setShowSizePicker(false);
    editorRef.current?.focus();
  };

  const setAlignment = (align: string) => {
    document.execCommand(`justify${align}`, false);
    editorRef.current?.focus();
  };

  const insertList = (ordered: boolean) => {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false);
    editorRef.current?.focus();
  };

  const highlightText = () => {
    document.execCommand('backColor', false, '#ffff00');
    editorRef.current?.focus();
  };

  const formatBlock = (tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const insertTable = () => {
    const table = `
      <table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 1</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 2</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 3</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 4</td>
        </tr>
      </table>
    `;
    document.execCommand('insertHTML', false, table);
    editorRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Template not found
          </h2>
          <Link to="/release-sheets?tab=templates" className="text-primary-500 hover:text-primary-600">
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Combined Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        {/* Template Title */}
        <div className="mx-auto py-4" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <div className="flex items-center space-x-4">
            <Link
              to="/release-sheets?tab=templates"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <input
              type="text"
              value={template.name}
              readOnly
              className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 text-left"
              style={{ background: 'none', backgroundColor: 'transparent' }}
            />
          </div>
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between mt-4">
            <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bold h-4 w-4">
                  <path d="M14 12a4 4 0 0 0 0-8H6v8"></path>
                  <path d="M15 20a4 4 0 0 0 0-8H6v8Z"></path>
                </svg>
              </button>
              <button onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Italic">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-italic h-4 w-4">
                  <line x1="19" x2="10" y1="4" y2="4"></line>
                  <line x1="14" x2="5" y1="20" y2="20"></line>
                  <line x1="15" x2="9" y1="4" y2="20"></line>
                </svg>
              </button>
              <button onClick={() => execCommand('underline')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-underline h-4 w-4">
                  <path d="M6 4v6a6 6 0 0 0 12 0V4"></path>
                  <line x1="4" x2="20" y1="20" y2="20"></line>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button onClick={() => formatBlock('h1')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Heading 1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading1 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="m17 12 3-2v8"></path>
                </svg>
              </button>
              <button onClick={() => formatBlock('h2')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Heading 2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading2 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"></path>
                </svg>
              </button>
              <button onClick={() => formatBlock('h3')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Heading 3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heading3 h-4 w-4">
                  <path d="M4 12h8"></path>
                  <path d="M4 18V6"></path>
                  <path d="M12 18V6"></path>
                  <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"></path>
                  <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"></path>
                </svg>
              </button>
              <button onClick={() => formatBlock('p')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Paragraph">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pilcrow h-4 w-4">
                  <path d="M13 4v16"></path>
                  <path d="M17 4v16"></path>
                  <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button onClick={() => insertList(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Bullet List">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list h-4 w-4">
                  <line x1="8" x2="21" y1="6" y2="6"></line>
                  <line x1="8" x2="21" y1="12" y2="12"></line>
                  <line x1="8" x2="21" y1="18" y2="18"></line>
                  <line x1="3" x2="3.01" y1="6" y2="6"></line>
                  <line x1="3" x2="3.01" y1="12" y2="12"></line>
                  <line x1="3" x2="3.01" y1="18" y2="18"></line>
                </svg>
              </button>
              <button onClick={() => insertList(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Numbered List">
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
              <button onClick={() => formatBlock('blockquote')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Quote">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-quote h-4 w-4">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2 relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Text Color">
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
                      <button key={color} onClick={() => setTextColor(color)} className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowSizePicker(!showSizePicker)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Text Size">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type h-4 w-4">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" x2="15" y1="20" y2="20"></line>
                  <line x1="12" x2="12" y1="4" y2="20"></line>
                </svg>
              </button>
              {showSizePicker && (
                <div className="absolute top-full left-12 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20">
                  <div className="flex flex-col space-y-1">
                    {[{ size: '1', label: 'Small' }, { size: '3', label: 'Normal' }, { size: '4', label: 'Medium' }, { size: '5', label: 'Large' }, { size: '6', label: 'Extra Large' }, { size: '7', label: 'Huge' }].map(({ size, label }) => (
                      <button key={size} onClick={() => setTextSize(size)} className="px-3 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button onClick={highlightText} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Highlight Text">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-highlighter h-4 w-4">
                  <path d="m9 11-6 6v3h9l3-3"></path>
                  <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
                </svg>
              </button>
              <button onClick={insertTable} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Insert Table">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table h-4 w-4">
                  <path d="M12 3v18"></path>
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M3 15h18"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center">
              <button onClick={() => setAlignment('Left')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Align Left">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-left h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="15" x2="3" y1="12" y2="12"></line>
                  <line x1="17" x2="3" y1="18" y2="18"></line>
                </svg>
              </button>
              <button onClick={() => setAlignment('Center')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Align Center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-center h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="17" x2="7" y1="12" y2="12"></line>
                  <line x1="19" x2="5" y1="18" y2="18"></line>
                </svg>
              </button>
              <button onClick={() => setAlignment('Right')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Align Right">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-right h-4 w-4">
                  <line x1="21" x2="3" y1="6" y2="6"></line>
                  <line x1="21" x2="9" y1="12" y2="12"></line>
                  <line x1="21" x2="7" y1="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={undoAction} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Undo">
                <Undo className="h-4 w-4" />
              </button>
              <button onClick={redoAction} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Redo">
                <Redo className="h-4 w-4" />
              </button>
            </div>
          </div>
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
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">
            Saved {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="mx-auto" style={{ paddingLeft: '10%', paddingRight: '10%', paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorChange}
          onKeyUp={handleEditorChange}
          onPaste={handleEditorChange}
          className="min-h-[600px] focus:outline-none prose prose-lg dark:prose-invert max-w-none"
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        />
      </div>
    </div>
  );
};
