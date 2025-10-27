import {
  TiptapLink,
  TiptapImage,
  TaskList,
  TaskItem,
  StarterKit,
} from 'novel';
import { slashCommand } from './slash-command.tsx';

// Configure extensions with basic settings following Novel docs
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: 'text-blue-500 underline underline-offset-2 hover:text-blue-600 transition-colors cursor-pointer',
  },
});

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: 'rounded-lg border border-gray-200 max-w-xs',
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: 'not-prose pl-2',
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: 'flex gap-2 items-start my-4',
  },
  nested: true,
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: 'list-disc list-outside leading-3 -mt-2',
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: 'list-decimal list-outside leading-3 -mt-2',
    },
  },
  listItem: {
    HTMLAttributes: {
      class: 'leading-normal -mb-2',
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: 'border-l-4 border-gray-300 pl-4',
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: 'rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border p-5 font-mono font-medium',
    },
  },
  code: {
    HTMLAttributes: {
      class: 'rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-1 font-mono font-medium',
      spellcheck: 'false',
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: '#DBEAFE',
    width: 4,
  },
  gapcursor: false,
});

export const defaultExtensions = [
  starterKit,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  slashCommand,
];
