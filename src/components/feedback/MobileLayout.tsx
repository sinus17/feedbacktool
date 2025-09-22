import React from 'react';
import { VideoPlayer } from '../VideoPlayer';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { AlertCircle } from 'lucide-react';
import type { VideoSubmission } from '../../types';

interface MobileLayoutProps {
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
  onDeleteMessage: (id: string) => Promise<void>;
  onMarkAsReady?: () => void;
  artistAvatar?: string;
  profiles?: Array<{id: string; name: string; avatar_url?: string}>;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
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
  onMarkAsReady,
  artistAvatar,
  profiles = []
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Video player container - 28vh (80% of original 35vh) */}
      <div className="flex-shrink-0 h-[28vh] flex items-center justify-center bg-black">
        <div className="h-full aspect-[9/16] relative">
          <VideoPlayer 
            key={submission.videoUrl}
            url={submission.videoUrl} 
            isDesktop={false}
          />
        </div>
      </div>

      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto px-4">
        <div ref={chatRef} className="py-4 space-y-4">
          <ChatMessages
            messages={submission.messages}
            isArtistView={isArtistView}
            hoveredMessageId={hoveredMessageId}
            onMessageHover={onMessageHover}
            onDeleteMessage={onDeleteMessage}
            artistAvatar={artistAvatar}
            profiles={profiles}
          />
        </div>
      </div>

      {/* Fixed input area at bottom */}
      <div className="flex-shrink-0 border-t border-gray-700 bg-[#121313] p-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

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
  );
};