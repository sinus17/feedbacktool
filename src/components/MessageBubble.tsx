import React, { useState } from 'react';
import { Check, XCircle, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';
import { OptimizedImage } from './OptimizedImage';

interface MessageBubbleProps {
  text: string;
  createdAt: string;
  isOwn: boolean;
  readAt?: string | null;
  isAdmin: boolean;
  senderName?: string;
  avatarUrl?: string;
  onDelete?: () => Promise<void>;
  showDeleteButton: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  createdAt,
  isOwn,
  readAt,
  isAdmin,
  senderName,
  avatarUrl,
  onDelete,
  showDeleteButton,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      setError(null);
      await onDelete();
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  // Split text into paragraphs and preserve whitespace
  const paragraphs = text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line || '\u00A0'}
      {i < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  return (
    <div className={`flex mt-2.5 ${isOwn ? 'justify-end pr-2' : 'justify-start'}`}>
      {senderName && (
        <div className="flex-shrink-0 mr-3">
          <OptimizedImage
            src={avatarUrl || ''}
            alt={senderName || 'User'}
            className="h-[30px] w-[30px] rounded-full object-cover"
            fallbackInitial={senderName?.charAt(0)?.toUpperCase() || 'A'}
          />
        </div>
      )}
      <div className="relative max-w-[85%]">
        {error && (
          <div className="absolute -top-8 left-0 right-0 flex items-center justify-center">
            <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-2 py-1 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          </div>
        )}
        
        <div
          className={`message-bubble whitespace-pre-wrap ${
            isOwn
              ? 'message-bubble-own'
              : 'message-bubble-other'
          }`}
        >
          {senderName && (
            <div className="text-xs font-medium opacity-75 mb-5">
              {senderName}
            </div>
          )}
          <p className="text-sm break-words">{paragraphs}</p>
          <div className="flex items-center justify-between mt-5">
            <p className="text-xs opacity-75">
              {formatDateTime(createdAt)}
            </p>
            {isAdmin && readAt && (
              <div className="flex items-center ml-2">
                <Check className="h-3 w-3 text-dark-600" />
                <Check className="h-3 w-3 text-dark-600 -ml-1.5" />
              </div>
            )}
          </div>
        </div>
        
        {showDeleteButton && onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`absolute -right-2 -top-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-dark-modal rounded-full shadow-sm transition-opacity ${
              isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Delete message"
          >
            <XCircle className={`h-5 w-5 ${isDeleting ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};