import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface SlashCommandMenuProps {
  items: Array<{
    title: string;
    command: (props: any) => void;
  }>;
  command: (item: any) => void;
}

export const SlashCommandMenu = forwardRef((props: SlashCommandMenuProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2 min-w-[200px]">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            key={index}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => selectItem(index)}
          >
            {item.title}
          </button>
        ))
      ) : (
        <div className="text-gray-500 text-sm px-3 py-2">No results</div>
      )}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
