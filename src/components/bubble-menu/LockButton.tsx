import { useState, useEffect } from 'react';
import { EditorBubbleItem, useEditor } from 'novel';
import { Lock, Unlock } from 'lucide-react';

interface LockButtonProps {
  isTemplate: boolean;
  lockedNodes: number[];
  onLockToggle: (position: number, isLocked: boolean) => void;
}

export const LockButton = ({ isTemplate, lockedNodes, onLockToggle }: LockButtonProps) => {
  const { editor } = useEditor();
  const [isLocked, setIsLocked] = useState(false);
  const [currentNodePos, setCurrentNodePos] = useState<number | null>(null);
  
  if (!editor || !isTemplate) return null;

  // Update locked state when selection changes
  useEffect(() => {
    const updateLockState = () => {
      const { $from } = editor.state.selection;
      const pos = $from.before($from.depth);
      setCurrentNodePos(pos);
      const locked = lockedNodes.includes(pos);
      setIsLocked(locked);
    };

    // Update on selection change
    editor.on('selectionUpdate', updateLockState);
    editor.on('update', updateLockState);
    editor.on('transaction', updateLockState);
    
    // Initial update
    updateLockState();

    return () => {
      editor.off('selectionUpdate', updateLockState);
      editor.off('update', updateLockState);
      editor.off('transaction', updateLockState);
    };
  }, [editor, lockedNodes]);

  const toggleLock = () => {
    if (currentNodePos === null) return;
    
    // Toggle lock state and notify parent
    onLockToggle(currentNodePos, !isLocked);
  };

  return (
    <EditorBubbleItem
      onSelect={() => toggleLock()}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 w-10 rounded-none ${
        isLocked 
          ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' 
          : 'text-gray-700 dark:text-gray-300'
      } hover:bg-gray-100 dark:hover:bg-gray-700`}
    >
      {isLocked ? (
        <Unlock className="h-4 w-4" />
      ) : (
        <Lock className="h-4 w-4" />
      )}
    </EditorBubbleItem>
  );
};
