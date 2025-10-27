import { DollarSign } from 'lucide-react';
import { useState } from 'react';

interface PlaceholderItem {
  table: string;
  column: string;
  description: string;
  dataType: string;
}

// Fallback placeholders in case database query fails
const FALLBACK_PLACEHOLDERS: PlaceholderItem[] = [
  { table: 'releases', column: 'name', description: 'Song/release title', dataType: 'text' },
  { table: 'releases', column: 'release_date', description: 'Release date', dataType: 'date' },
  { table: 'releases', column: 'spotify_url', description: 'Release Spotify link', dataType: 'text' },
  { table: 'releases', column: 'master_file_url', description: 'Master audio file', dataType: 'text' },
  { table: 'artists', column: 'name', description: 'Artist name', dataType: 'text' },
  { table: 'artists', column: 'instagram_url', description: 'Instagram URL', dataType: 'text' },
  { table: 'artists', column: 'tiktok_url', description: 'TikTok URL', dataType: 'text' },
  { table: 'artists', column: 'spotify_url', description: 'Artist Spotify URL', dataType: 'text' },
];

interface PlaceholderMenuProps {
  editor: any;
  range: any;
  onClose: () => void;
}

export const PlaceholderMenu = ({ editor, range, onClose }: PlaceholderMenuProps) => {
  const [search, setSearch] = useState('');
  
  // Use fallback placeholders - these cover all the main fields needed
  // To add more, simply add them to FALLBACK_PLACEHOLDERS array above
  const placeholders = FALLBACK_PLACEHOLDERS;

  const filteredPlaceholders = placeholders.filter((p: PlaceholderItem) => {
    const searchLower = search.toLowerCase();
    return (
      p.table.toLowerCase().includes(searchLower) ||
      p.column.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  });

  const insertPlaceholder = (item: PlaceholderItem) => {
    const placeholder = `$${item.table}/${item.column}$`;
    editor.chain().focus().deleteRange(range).insertContent(placeholder).run();
    onClose();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden w-96">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search tables and columns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {filteredPlaceholders.length > 0 ? (
          filteredPlaceholders.map((item) => (
            <button
              key={`${item.table}-${item.column}`}
              onClick={() => insertPlaceholder(item)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {item.table} / {item.column}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.description}
                  </div>
                </div>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  ${item.table}/{item.column}$
                </code>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No placeholders found
          </div>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        💡 Search by table name or column name
      </div>
    </div>
  );
};

export const createPlaceholderCommand = () => ({
  title: 'Placeholder',
  description: 'Insert a database placeholder',
  searchTerms: ['placeholder', 'variable', 'field', 'database', '$'],
  icon: <DollarSign size={18} />,
  command: ({ editor, range }: any) => {
    // This will be handled by a custom render function
    // For now, just show a simple menu
    editor.chain().focus().deleteRange(range).run();
  },
});
