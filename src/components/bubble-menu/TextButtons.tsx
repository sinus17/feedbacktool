import { EditorBubbleItem, useEditor } from 'novel';
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react';

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items = [
    {
      name: 'bold',
      isActive: () => editor.isActive('bold'),
      command: () => editor.chain().focus().toggleBold().run(),
      icon: Bold,
    },
    {
      name: 'italic',
      isActive: () => editor.isActive('italic'),
      command: () => editor.chain().focus().toggleItalic().run(),
      icon: Italic,
    },
    {
      name: 'underline',
      isActive: () => editor.isActive('underline'),
      command: () => editor.chain().focus().toggleUnderline().run(),
      icon: Underline,
    },
    {
      name: 'strike',
      isActive: () => editor.isActive('strike'),
      command: () => editor.chain().focus().toggleStrike().run(),
      icon: Strikethrough,
    },
    {
      name: 'code',
      isActive: () => editor.isActive('code'),
      command: () => editor.chain().focus().toggleCode().run(),
      icon: Code,
    },
  ];

  return (
    <div className="flex">
      {items.map((item, index) => (
        <EditorBubbleItem
          key={index}
          onSelect={() => {
            item.command();
          }}
        >
          <button
            type="button"
            className="p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <item.icon
              className={`h-4 w-4 ${
                item.isActive() ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'
              }`}
            />
          </button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
