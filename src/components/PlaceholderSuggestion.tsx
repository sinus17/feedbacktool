import React from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { Database, Table } from 'lucide-react';

// Define types since @tiptap/suggestion might not be installed
type SuggestionOptions = any;

interface PlaceholderItem {
  title: string;
  description: string;
  placeholder: string;
  table: string;
  column: string;
}

const placeholderItems: PlaceholderItem[] = [
  {
    title: 'Release Name',
    description: 'Song or release title',
    placeholder: '{releases$name}',
    table: 'releases',
    column: 'name'
  },
  {
    title: 'Release Date',
    description: 'Release date (formatted)',
    placeholder: '{releases$release_date}',
    table: 'releases',
    column: 'release_date'
  },
  {
    title: 'Release Spotify URL',
    description: 'Spotify track/album URL',
    placeholder: '{releases$spotify_url}',
    table: 'releases',
    column: 'spotify_url'
  },
  {
    title: 'Master File URL',
    description: 'Master audio file URL',
    placeholder: '{releases$master_file_url}',
    table: 'releases',
    column: 'master_file_url'
  },
  {
    title: 'Artist Name',
    description: 'Artist or band name',
    placeholder: '{artists$name}',
    table: 'artists',
    column: 'name'
  },
  {
    title: 'Artist Instagram',
    description: 'Instagram profile URL',
    placeholder: '{artists$instagram_url}',
    table: 'artists',
    column: 'instagram_url'
  },
  {
    title: 'Artist TikTok',
    description: 'TikTok profile URL',
    placeholder: '{artists$tiktok_url}',
    table: 'artists',
    column: 'tiktok_url'
  },
  {
    title: 'Artist Spotify',
    description: 'Spotify artist profile URL',
    placeholder: '{artists$spotify_url}',
    table: 'artists',
    column: 'spotify_url'
  }
];

const PlaceholderList = ({ items, command }: { items: PlaceholderItem[]; command: (item: PlaceholderItem) => void }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items]);

  return (
    <div className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 py-2 shadow-md">
      {items.length > 0 ? (
        items.map((item, index) => (
          <button
            key={item.placeholder}
            onClick={() => selectItem(index)}
            className={`flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
              index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {item.table === 'releases' ? (
                <Database className="h-4 w-4" />
              ) : (
                <Table className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">{item.placeholder}</p>
            </div>
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-sm text-gray-500">No placeholders found</div>
      )}
    </div>
  );
};

export const createPlaceholderSuggestion = (enabled: boolean): Omit<SuggestionOptions, 'editor'> => ({
  char: '{',
  allowSpaces: false,
  
  items: ({ query }: any) => {
    // Only show suggestions if enabled (template pages)
    if (!enabled) {
      return [];
    }
    return placeholderItems.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.table.toLowerCase().includes(query.toLowerCase()) ||
      item.column.toLowerCase().includes(query.toLowerCase()) ||
      item.placeholder.toLowerCase().includes(query.toLowerCase())
    );
  },

  render: () => {
    let component: ReactRenderer;
    let popup: TippyInstance[];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(PlaceholderList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return false;
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },

  command: ({ editor, range, props }: any) => {
    const item = props as PlaceholderItem;
    
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent(item.placeholder)
      .run();
  },
});
