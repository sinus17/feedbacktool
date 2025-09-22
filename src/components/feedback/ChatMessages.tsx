import React from 'react';
import { MessageBubble } from '../MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  isArtistView: boolean;
  hoveredMessageId: string | null;
  onMessageHover: (id: string | null) => void;
  onDeleteMessage: (id: string) => Promise<void>;
  artistAvatar?: string;
  profiles?: Array<{id: string; name: string; avatar_url?: string}>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isArtistView,
  hoveredMessageId,
  onMessageHover,
  onDeleteMessage,
  artistAvatar,
  profiles = [],
}) => {
  const isOwnMessage = (isAdminMessage: boolean) => {
    return (isArtistView && !isAdminMessage) || (!isArtistView && isAdminMessage);
  };

  const getMessageSenderInfo = (message: Message) => {
    console.log('Debug - Message:', message);
    console.log('Debug - Profiles:', profiles);
    console.log('Debug - Looking for userId:', message.userId);
    
    if (message.isAdmin && message.userId) {
      // Find the specific admin user who sent this message
      const adminProfile = profiles.find(p => p.id === message.userId);
      console.log('Debug - Found profile:', adminProfile);
      
      if (adminProfile) {
        console.log('Debug - adminProfile.name:', adminProfile.name);
        console.log('Debug - adminProfile.avatar_url:', adminProfile.avatar_url);
        const result = {
          name: adminProfile.name,
          avatarUrl: adminProfile.avatar_url?.startsWith('http') 
            ? adminProfile.avatar_url 
            : adminProfile.avatar_url || '/avatars/philipp.png'
        };
        console.log('Debug - Final result:', result);
        return result;
      }
    }
    
    // Fallback to generic names and avatars
    const fallback = {
      name: message.isAdmin ? 'Admin' : 'Artist',
      avatarUrl: message.isAdmin 
        ? '/avatars/philipp.png' // default admin avatar
        : artistAvatar
    };
    console.log('Debug - Using fallback:', fallback);
    return fallback;
  };

  // Sort messages by creation date (oldest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }),
    exit: { 
      opacity: 0, 
      x: isArtistView ? -100 : 100,
      transition: {
        duration: 0.2
      }
    }
  };

  if (messages.length === 0) {
    return (
      <motion.div 
        className="flex items-center justify-center h-32 text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p>No feedback yet</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {sortedMessages.map((message, index) => {
        const senderInfo = getMessageSenderInfo(message);
        return (
          <motion.div
            key={message.id}
            custom={index}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseEnter={() => onMessageHover(message.id.toString())}
            onMouseLeave={() => onMessageHover(null)}
            layout
          >
            <MessageBubble
              text={message.text}
              createdAt={message.createdAt}
              isOwn={isOwnMessage(message.isAdmin)}
              readAt={message.readAt}
              isAdmin={message.isAdmin}
              senderName={senderInfo.name}
              avatarUrl={senderInfo.avatarUrl}
              onDelete={
                !isArtistView && message.isAdmin && hoveredMessageId === message.id.toString()
                  ? () => onDeleteMessage(message.id.toString())
                  : undefined
              }
              showDeleteButton={!isArtistView && message.isAdmin && hoveredMessageId === message.id.toString()}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};