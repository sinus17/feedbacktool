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
    console.log('=== AVATAR DEBUG ===');
    console.log('Message userId:', message.userId);
    console.log('Message isAdmin:', message.isAdmin);
    console.log('Available profiles:', profiles.map(p => ({ id: p.id, name: p.name, avatar_url: p.avatar_url })));
    
    if (message.isAdmin) {
      // If we have a userId, try to find the specific admin profile
      if (message.userId) {
        const adminProfile = profiles.find(p => p.id === message.userId);
        console.log('Found matching profile:', adminProfile);
        
        if (adminProfile) {
          console.log('Admin profile found:', adminProfile.name);
          
          // Map admin names to their specific avatars based on their actual profile name
          const adminAvatarMap: Record<string, string> = {
            'philipp lützenburger': '/avatars/philipp.png',
            'philipp': '/avatars/philipp.png',
            'lukas': '/avatars/lukas.png',
            'lukas rettenegger': '/avatars/lukas.png',
            'martijn': '/avatars/martijn.png'
          };
          
          // Use the profile's actual name and map to corresponding avatar
          const nameKey = adminProfile.name.toLowerCase().trim();
          console.log('Looking up avatar for name key:', nameKey);
          
          // Prioritize database avatar_url, then try name mapping, then fallback
          let avatarUrl;
          
          if (adminProfile.avatar_url) {
            avatarUrl = adminProfile.avatar_url;
            console.log('Using database avatar_url:', avatarUrl);
          } else {
            // Try exact name match in avatar mapping
            avatarUrl = adminAvatarMap[nameKey];
            
            // Try partial match for names containing 'lukas'
            if (!avatarUrl && nameKey.includes('lukas')) {
              avatarUrl = '/avatars/lukas.png';
              console.log('Using Lukas avatar for name containing "lukas"');
            }
            
            // Final fallback to generic admin avatar
            avatarUrl = avatarUrl || '/plane_white.png';
          }
          
          const result = {
            name: adminProfile.name, // Use actual profile name
            avatarUrl: avatarUrl
          };
          console.log('Final result for admin message:', result);
          return result;
        } else {
          console.log('No profile found for userId:', message.userId);
        }
      }
      
      // Fallback for admin messages without userId or profile not found
      const adminFallback = {
        name: 'Admin',
        avatarUrl: '/plane_white.png' // generic admin avatar (paperplane logo)
      };
      console.log('Using admin fallback:', adminFallback);
      return adminFallback;
    }
    
    // For artist messages
    const artistFallback = {
      name: 'Artist',
      avatarUrl: artistAvatar || '/avatars/default-artist.png'
    };
    console.log('Using artist fallback:', artistFallback);
    return artistFallback;
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