import React from 'react';
import { MessageBubble } from '../MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  isArtistView: boolean;
  hoveredMessageId: string | null;
  onMessageHover: (id: string | null) => void;
  onDeleteMessage: (id: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isArtistView,
  hoveredMessageId,
  onMessageHover,
  onDeleteMessage,
}) => {
  const isOwnMessage = (isAdminMessage: boolean) => {
    return (isArtistView && !isAdminMessage) || (!isArtistView && isAdminMessage);
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
      {sortedMessages.map((message, index) => (
        <motion.div
          key={message.id}
          custom={index}
          variants={messageVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onMouseEnter={() => onMessageHover(message.id)}
          onMouseLeave={() => onMessageHover(null)}
          layout
        >
          <MessageBubble
            text={message.text}
            createdAt={message.createdAt}
            isOwn={isOwnMessage(message.isAdmin)}
            readAt={message.readAt}
            isAdmin={message.isAdmin}
            onDelete={
              !isArtistView && message.isAdmin && hoveredMessageId === message.id
                ? () => onDeleteMessage(message.id)
                : undefined
            }
            showDeleteButton={!isArtistView && message.isAdmin && hoveredMessageId === message.id}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
};