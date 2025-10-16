import React, { useState } from 'react';
import {
  EditorRoot,
  EditorContent,
  type JSONContent,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandList,
  EditorBubble,
} from 'novel';
import { defaultExtensions } from './simple-novel-extensions';
import { NodeSelector } from './bubble-menu/NodeSelector';
import { TextButtons } from './bubble-menu/TextButtons';
import { LinkSelector } from './bubble-menu/LinkSelector';

interface SimpleNovelEditorProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent) => void;
  onBlur?: () => void;
  editable?: boolean;
}

export const SimpleNovelEditor: React.FC<SimpleNovelEditorProps> = ({
  initialContent,
  onChange,
  onBlur,
  editable = true,
}) => {
  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  return (
    <div className="relative w-full">
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={defaultExtensions}
          className="relative min-h-[500px] w-full bg-transparent p-0"
          editorProps={{
            attributes: {
              class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-full',
            },
          }}
          onUpdate={({ editor }) => {
            const json = editor.getJSON();
            onChange?.(json);
          }}
          onBlur={() => {
            onBlur?.();
          }}
          editable={editable}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-gray-500">No results</EditorCommandEmpty>
            <EditorCommandList>
              {/* Command items will be added via slash command extension */}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble
            tippyOptions={{
              placement: 'top',
            }}
            className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
          >
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            <TextButtons />
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};
