import React, { useEffect, useState, useCallback } from 'react';
import { type JSONContent } from 'novel';

// Simple wrapper for Novel editor that handles the release sheet use case
interface ReleaseSheetNovelEditorProps {
  initialContent?: string; // HTML string from existing sheets
  onChange?: (htmlContent: string, jsonContent: JSONContent) => void;
  onBlur?: () => void;
  editable?: boolean;
}

export const ReleaseSheetNovelEditor: React.FC<ReleaseSheetNovelEditorProps> = ({
  initialContent,
  onChange,
  onBlur,
  editable = true,
}) => {
  const [NovelEditor, setNovelEditor] = useState<any>(null);
  const [jsonContent, setJsonContent] = useState<JSONContent | undefined>();

  // Dynamically import Novel to avoid SSR issues
  useEffect(() => {
    import('./NovelEditor').then((mod) => {
      setNovelEditor(() => mod.NovelEditor);
    }).catch((err) => {
      console.error('Failed to load Novel editor:', err);
    });
  }, []);

  // Convert HTML to JSON content for Novel
  const htmlToJson = useCallback((html: string): JSONContent => {
    // Simple conversion - Novel will handle the actual parsing
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: html ? [{ type: 'text', text: html }] : [],
        },
      ],
    };
  }, []);

  // Convert JSON content to HTML
  const jsonToHtml = useCallback((json: JSONContent): string => {
    // This is a simplified version - Novel's editor will provide the actual HTML
    if (!json || !json.content) return '';
    
    // For now, return a basic HTML representation
    // The actual conversion will be handled by the editor
    return JSON.stringify(json);
  }, []);

  useEffect(() => {
    if (initialContent && !jsonContent) {
      setJsonContent(htmlToJson(initialContent));
    }
  }, [initialContent, htmlToJson, jsonContent]);

  const handleChange = useCallback((json: JSONContent) => {
    setJsonContent(json);
    const html = jsonToHtml(json);
    onChange?.(html, json);
  }, [onChange, jsonToHtml]);

  if (!NovelEditor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <NovelEditor
      initialContent={jsonContent}
      onChange={handleChange}
      onBlur={onBlur}
      editable={editable}
    />
  );
};
