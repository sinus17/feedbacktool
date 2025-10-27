import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ComponentExample {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  preview: React.ReactNode;
}

export const ComponentLibrary: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const components: ComponentExample[] = [
    {
      id: 'artist-favorites',
      name: 'Artist Favorites',
      description: 'Grid of liked videos from the library',
      category: 'media',
      code: `<div id="artist-favorites-legacy-container"></div>`,
      preview: (
        <div className="text-sm text-gray-400 p-4 border border-dark-700 rounded-lg bg-dark-900">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span>Artist Favorites Component (renders dynamically)</span>
          </div>
          <p className="text-xs text-gray-500">This component automatically displays liked videos from the library in a grid layout.</p>
        </div>
      ),
    },
    {
      id: 'video-grid',
      name: 'Video Grid',
      description: 'Responsive grid layout for videos',
      category: 'layout',
      code: `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  <!-- Add your video cards here -->
</div>`,
      preview: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[9/16] bg-dark-700 rounded-lg border border-dark-600"></div>
          ))}
        </div>
      ),
    },
    {
      id: 'stats-card',
      name: 'Stats Card',
      description: 'Card displaying video statistics',
      category: 'media',
      code: `<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
  <div class="flex items-center gap-3 text-sm">
    <div class="flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
      </svg>
      <span>1.2M views</span>
    </div>
    <div class="flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
      </svg>
      <span>45K likes</span>
    </div>
  </div>
</div>`,
      preview: (
        <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
          <div className="flex items-center gap-4 text-sm text-white">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span>1.2M views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>45K likes</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'button-primary',
      name: 'Primary Button',
      description: 'Primary action button',
      category: 'buttons',
      code: `<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
  Click me
</button>`,
      preview: (
        <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium">
          Click me
        </button>
      ),
    },
    {
      id: 'alert-info',
      name: 'Info Alert',
      description: 'Information alert box',
      category: 'alerts',
      code: `<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
  <div class="flex items-start gap-3">
    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
    </svg>
    <div>
      <h4 class="font-semibold text-blue-900 dark:text-blue-100">Information</h4>
      <p class="text-sm text-blue-800 dark:text-blue-200 mt-1">This is an informational message.</p>
    </div>
  </div>
</div>`,
      preview: (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-100">Information</h4>
              <p className="text-sm text-blue-200 mt-1">This is an informational message.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'two-column',
      name: 'Two Column Layout',
      description: 'Responsive two-column layout',
      category: 'layout',
      code: `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
    <h3 class="font-semibold mb-2">Column 1</h3>
    <p class="text-gray-600 dark:text-gray-400">Content goes here</p>
  </div>
  <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
    <h3 class="font-semibold mb-2">Column 2</h3>
    <p class="text-gray-600 dark:text-gray-400">Content goes here</p>
  </div>
</div>`,
      preview: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 className="font-semibold mb-2 text-white">Column 1</h3>
            <p className="text-gray-400 text-sm">Content goes here</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <h3 className="font-semibold mb-2 text-white">Column 2</h3>
            <p className="text-gray-400 text-sm">Content goes here</p>
          </div>
        </div>
      ),
    },
  ];

  const categories = ['all', ...Array.from(new Set(components.map(c => c.category)))];
  const filteredComponents = selectedCategory === 'all' 
    ? components 
    : components.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Component Library
          </h1>
          <p className="text-gray-400">
            Reusable components for Novel editor. Copy the code and paste into your release sheets.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-gray-300 hover:bg-dark-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredComponents.map((component) => (
            <div
              key={component.id}
              className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-dark-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {component.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">
                      {component.description}
                    </p>
                    <span className="inline-block px-3 py-1 bg-dark-700 text-xs font-medium text-gray-300 rounded-full">
                      {component.category}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(component.code, component.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                  >
                    {copiedId === component.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="p-6 bg-dark-900 border-b border-dark-700">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Preview
                </h4>
                <div className="bg-dark-800 rounded-lg p-4">
                  {component.preview}
                </div>
              </div>

              {/* Code */}
              <div className="p-6 bg-dark-950">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  HTML Code
                </h4>
                <pre className="text-xs text-gray-300 overflow-x-auto bg-black/30 rounded-lg p-4 border border-dark-700">
                  <code>{component.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No components found in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
