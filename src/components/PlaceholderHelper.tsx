import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface PlaceholderItem {
  label: string;
  value: string;
  description: string;
}

const PLACEHOLDERS: PlaceholderItem[] = [
  { label: 'Release Name', value: '$releases/name$', description: 'Song/release title' },
  { label: 'Release Date', value: '$releases/release_date$', description: 'Release date (DD.MM.YYYY)' },
  { label: 'Spotify URL', value: '$releases/spotify_url$', description: 'Release Spotify link' },
  { label: 'Master File', value: '$releases/master_file_url$', description: 'Master audio file URL' },
  { label: 'Artist Name', value: '$artists/name$', description: 'Artist name' },
  { label: 'Instagram', value: '$artists/instagram_url$', description: 'Artist Instagram URL' },
  { label: 'TikTok', value: '$artists/tiktok_url$', description: 'Artist TikTok URL' },
  { label: 'Artist Spotify', value: '$artists/spotify_url$', description: 'Artist Spotify URL' },
];

export const PlaceholderHelper = () => {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all"
        title="Show available placeholders"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Info className="h-5 w-5" />}
      </button>

      {/* Helper panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3">
            <h3 className="font-semibold">Available Placeholders</h3>
            <p className="text-xs text-blue-100 mt-1">Click to copy to clipboard</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            {PLACEHOLDERS.map((item) => (
              <button
                key={item.value}
                onClick={() => copyToClipboard(item.value)}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {item.value}
                  </code>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            💡 Tip: Type placeholders manually in format <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">$table/column$</code>
          </div>
        </div>
      )}
    </>
  );
};
