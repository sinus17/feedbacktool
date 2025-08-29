import React from 'react';
import { VideoPlayer } from '../VideoPlayer';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { AlertCircle } from 'lucide-react';
import type { VideoSubmission } from '../../types';

interface DesktopLayoutProps {
  submission: VideoSubmission;
  isArtistView: boolean;
  error: string | null;
  newMessage: string;
  notes?: string;
  isSubmitting: boolean;
  hoveredMessageId: string | null;
  chatRef: React.RefObject<HTMLDivElement>;
  onMessageChange: (value: string) => void;
  onNotesChange?: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMessageHover: (id: string | null) => void;
  onDeleteMessage: (id: string) => void;
  onMarkAsReady?: () => void;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  submission,
  isArtistView,
  error,
  newMessage,
  notes,
  isSubmitting,
  hoveredMessageId,
  chatRef,
  onMessageChange,
  onNotesChange,
  onSubmit,
  onMessageHover,
  onDeleteMessage,
  onMarkAsReady
}) => {
  return (
    <div className="flex gap-4 h-full">
      <div className="w-[45%] p-2.5">
        <VideoPlayer 
          key={submission.videoUrl}
          url={submission.videoUrl} 
          isDesktop={true}
        />
      </div>

      <div className="w-[55%] flex flex-col">
        <div 
          ref={chatRef}
          className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 scrollbar-thin"
        >
          <ChatMessages
            messages={submission.messages || []}
            isArtistView={isArtistView}
            hoveredMessageId={hoveredMessageId}
            onMessageHover={onMessageHover}
            onDeleteMessage={onDeleteMessage}
          />
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex-shrink-0 pt-2">
          <MessageInput
            isArtistView={isArtistView}
            message={newMessage}
            notes={notes}
            onChange={onMessageChange}
            onNotesChange={onNotesChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            onMarkAsReady={onMarkAsReady}
            showMarkAsReady={!isArtistView && submission.status !== 'ready'}
          />
        </div>
      </div>
    </div>
  );
};