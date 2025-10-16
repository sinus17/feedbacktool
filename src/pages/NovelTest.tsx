import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SimpleNovelEditor } from '../components/SimpleNovelEditor';
import type { JSONContent } from 'novel';

export const NovelTest: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [jsonContent, setJsonContent] = useState<JSONContent | null>(null);

  const handleChange = (json: JSONContent) => {
    setJsonContent(json);
    setContent(JSON.stringify(json, null, 2));
    console.log('Content changed:', json);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Novel Editor Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the Novel rich text editor integration
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Editor
          </h2>
          <SimpleNovelEditor
            initialContent={{
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Welcome to Novel!' }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Start typing to test the editor. Try using / for commands.' }],
                },
              ],
            }}
            onChange={handleChange}
            onBlur={() => console.log('Editor blurred')}
            editable={true}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Output
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HTML Content:
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                {content || 'No content yet'}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                JSON Content:
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs">
                {jsonContent ? JSON.stringify(jsonContent, null, 2) : 'No content yet'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
