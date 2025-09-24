import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Quote, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Palette, Type, Table, Highlighter } from 'lucide-react';

interface NotionEditorProps {
  initialContent?: { blocks: any[] };
  onChange: (content: { blocks: any[] }) => void;
  placeholder?: string;
}

export const NotionEditor: React.FC<NotionEditorProps> = ({
  initialContent = { blocks: [] },
  onChange,
  placeholder = "Start writing..."
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  useEffect(() => {
    // Convert initial blocks to HTML content
    if (initialContent.blocks && initialContent.blocks.length > 0) {
      const htmlContent = initialContent.blocks
        .map(block => block.content || '')
        .join('<br>');
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent || '';
      }
    }
  }, []);

  useEffect(() => {
    // Close dropdowns when clicking outside
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

  const handleContentChange = () => {
    if (editorRef.current) {
      const htmlContent = editorRef.current.innerHTML;
      
      // Convert HTML back to blocks format for compatibility
      const blocks = [{
        id: 'main-content',
        type: 'paragraph',
        content: htmlContent
      }];
      
      onChange({ blocks });
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', tag);
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
    execCommand('hiliteColor', '#ffff00');
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    
    if (rows && cols) {
      let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="border: 1px solid #ccc; padding: 8px; min-width: 100px; min-height: 30px;"></td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table>';
      
      execCommand('insertHTML', tableHTML);
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900">
      {/* Floating Toolbar */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-3">
        <div className="max-w-4xl mx-auto px-8">
          <div className="flex flex-wrap items-center gap-1 justify-start">
            {/* Text Formatting */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button
                onClick={() => execCommand('bold')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
            </div>

            {/* Headings */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button
                onClick={() => formatBlock('h1')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </button>
              <button
                onClick={() => formatBlock('h2')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => formatBlock('h3')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button
                onClick={() => insertList(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertList(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
            </div>

            {/* Quote */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button
                onClick={() => formatBlock('blockquote')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </button>
            </div>

            {/* Text Color & Size */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2 relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
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
                <Type className="h-4 w-4" />
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

            {/* Highlight & Table */}
            <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-2">
              <button
                onClick={highlightText}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Highlight Text"
              >
                <Highlighter className="h-4 w-4" />
              </button>
              <button
                onClick={insertTable}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Insert Table"
              >
                <Table className="h-4 w-4" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center">
              <button
                onClick={() => setAlignment('Left')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAlignment('Center')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAlignment('Right')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="mx-auto py-12 min-h-[calc(100vh-120px)] outline-none text-gray-900 dark:text-white prose prose-lg max-w-none dark:prose-invert"
        style={{
          lineHeight: '1.7',
          fontSize: '18px',
          paddingLeft: '20%',
          paddingRight: '20%',
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

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
        }
        
        [contenteditable] li {
          margin: 0.25rem 0;
        }
        
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        
        [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};
