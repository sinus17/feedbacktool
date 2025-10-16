import React, { useEffect, useRef } from 'react';
import { useEditor } from 'novel';
import { Check, Trash } from 'lucide-react';

interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkSelector: React.FC<LinkSelectorProps> = ({ open, onOpenChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { editor } = useEditor();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!editor) return null;

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-full items-center space-x-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 active:bg-stone-200"
        onClick={() => {
          onOpenChange(!open);
        }}
      >
        <p className="text-base">↗</p>
        <p
          className={
            editor.isActive('link')
              ? 'underline underline-offset-4'
              : ''
          }
        >
          Link
        </p>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[99999] mt-1 flex w-60 flex-col overflow-hidden rounded border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste a link"
              className="flex-1 bg-white p-1 text-sm outline-none"
              defaultValue={editor.getAttributes('link').href || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const url = e.currentTarget.value;
                  if (url) {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange('link')
                      .setLink({ href: url })
                      .run();
                  }
                  onOpenChange(false);
                }
              }}
            />
            {editor.getAttributes('link').href && (
              <button
                type="button"
                className="flex items-center rounded-sm p-1 text-red-600 transition-all hover:bg-red-100"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  onOpenChange(false);
                }}
              >
                <Trash className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
