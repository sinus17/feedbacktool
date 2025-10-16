import React from 'react';
import { useEditor } from 'novel';
import { Bold, Italic, Underline, Strikethrough, Code } from 'lucide-react';

export const TextButtons: React.FC = () => {
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
        <button
          key={index}
          onClick={item.command}
          className={`p-2 text-stone-600 hover:bg-stone-100 active:bg-stone-200 ${
            item.isActive() ? 'bg-stone-100' : ''
          }`}
          type="button"
        >
          <item.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};
