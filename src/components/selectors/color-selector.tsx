import React from 'react';
import { useEditor } from 'novel';
import { Check, ChevronDown } from 'lucide-react';

interface ColorSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEXT_COLORS = [
  { name: 'Default', color: 'var(--novel-black)' },
  { name: 'Purple', color: '#9333EA' },
  { name: 'Red', color: '#E00000' },
  { name: 'Yellow', color: '#EAB308' },
  { name: 'Blue', color: '#2563EB' },
  { name: 'Green', color: '#008A00' },
  { name: 'Orange', color: '#FFA500' },
  { name: 'Pink', color: '#BA4081' },
  { name: 'Gray', color: '#A8A29E' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Default', color: 'var(--novel-highlight-default)' },
  { name: 'Purple', color: '#F6F3F8' },
  { name: 'Red', color: '#FDEBEC' },
  { name: 'Yellow', color: '#FEF9C3' },
  { name: 'Blue', color: '#DBEAFE' },
  { name: 'Green', color: '#F0FDF4' },
  { name: 'Orange', color: '#FFF7ED' },
  { name: 'Pink', color: '#FCE7F3' },
  { name: 'Gray', color: '#F5F5F4' },
];

export const ColorSelector: React.FC<ColorSelectorProps> = ({ open, onOpenChange }) => {
  const { editor } = useEditor();

  if (!editor) return null;

  const activeColorItem = TEXT_COLORS.find(({ color }) =>
    editor.isActive('textStyle', { color })
  );

  const activeHighlightItem = HIGHLIGHT_COLORS.find(({ color }) =>
    editor.isActive('highlight', { color })
  );

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        className="flex h-full items-center gap-1 p-2 text-sm font-medium text-stone-600 hover:bg-stone-100 active:bg-stone-200"
      >
        <span
          className="rounded-sm px-1"
          style={{
            color: activeColorItem?.color,
            backgroundColor: activeHighlightItem?.color,
          }}
        >
          A
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[99999] mt-1 flex w-48 flex-col overflow-hidden rounded border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="my-1 px-2 text-sm text-stone-500">Color</div>
          {TEXT_COLORS.map(({ name, color }, index) => (
            <button
              key={index}
              onClick={() => {
                editor.commands.unsetColor();
                name !== 'Default' &&
                  editor
                    .chain()
                    .focus()
                    .setColor(color || '')
                    .run();
                onOpenChange(false);
              }}
              className="flex items-center justify-between rounded-sm px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="rounded-sm border border-stone-200 px-2 py-px font-medium"
                  style={{ color }}
                >
                  A
                </div>
                <span>{name}</span>
              </div>
              {editor.isActive('textStyle', { color }) && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}

          <div className="mb-1 mt-2 px-2 text-sm text-stone-500">Background</div>
          {HIGHLIGHT_COLORS.map(({ name, color }, index) => (
            <button
              key={index}
              onClick={() => {
                editor.commands.unsetHighlight();
                name !== 'Default' && editor.commands.setHighlight({ color });
                onOpenChange(false);
              }}
              className="flex items-center justify-between rounded-sm px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="rounded-sm border border-stone-200 px-2 py-px font-medium"
                  style={{ backgroundColor: color }}
                >
                  A
                </div>
                <span>{name}</span>
              </div>
              {editor.isActive('highlight', { color }) && (
                <Check className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
