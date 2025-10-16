import { useEffect, useRef } from 'react';
import { useEditor } from 'novel';
import { Check, Trash } from 'lucide-react';

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function getUrlFromString(str: string) {
  if (isValidUrl(str)) return str;
  try {
    if (str.includes('.') && !str.includes(' ')) {
      return new URL(`https://${str}`).toString();
    }
  } catch (e) {
    return null;
  }
  return null;
}

interface LinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LinkSelector = ({ open, onOpenChange }: LinkSelectorProps) => {
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
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
      >
        <span className="text-base">↗</span>
        <span
          className={`underline decoration-gray-400 underline-offset-4 ${
            editor.isActive('link') ? 'text-blue-500' : ''
          }`}
        >
          Link
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = inputRef.current;
              if (!input) return;
              
              const url = getUrlFromString(input.value);
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
                onOpenChange(false);
              }
            }}
            className="flex gap-1"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste a link"
              className="flex-1 bg-transparent p-2 text-sm outline-none border border-gray-200 dark:border-gray-700 rounded"
              defaultValue={editor.getAttributes('link').href || ''}
            />
            {editor.getAttributes('link').href ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  onOpenChange(false);
                }}
              >
                <Trash className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
