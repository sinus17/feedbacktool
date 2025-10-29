import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { ConfirmationModal } from './ConfirmationModal';
import { formatFeedbackMessage } from '../utils/feedback';
import { MobileLayout } from './feedback/MobileLayout';
import { DesktopLayout } from './feedback/DesktopLayout';
import type { VideoSubmission } from '../types';

interface FeedbackModalProps {
  submission: VideoSubmission;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ submission: initialSubmission, onClose, onUpdate }) => {
  const [newMessage, setNewMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    messageId: string | null;
  }>({
    isOpen: false,
    messageId: null,
  });
  const [confirmReady, setConfirmReady] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  const { updateSubmission, addMessage, deleteMessage, markMessagesAsRead, submissions, artists } = useStore();
  const [currentSubmission, setCurrentSubmission] = useState(initialSubmission);
  
  // Get artist avatar for chat messages
  const artist = artists.find(a => a.id === currentSubmission.artistId);
  const artistAvatar = artist?.avatarUrl;
  
  // Get profiles for admin user identification
  const [profiles, setProfiles] = useState<Array<{id: string; name: string; avatar_url?: string}>>([]);

  // Fetch profiles on mount (only once)
  useEffect(() => {
    if (profiles.length === 0) {
      const fetchProfiles = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url');
        
        if (!error && data) {
          console.log('=== PROFILES LOADED ===');
          console.log('Fetched profiles:', data);
          console.log('Profile count:', data.length);
          console.log('=== ALL PROFILES ===');
          data.forEach((p: any) => console.log(`Profile: ${p.name} (ID: ${p.id}) - Avatar: ${p.avatar_url || 'NONE'}`));
          console.log('=== YOUR CURRENT USER ID ===');
          supabase.auth.getUser().then(({ data: { user } }) => {
            console.log('Your current user ID:', user?.id);
            console.log('Your profile match:', data.find((p: any) => p.id === user?.id));
          });
          setProfiles(data as any);
        } else {
          console.error('Error fetching profiles:', error);
        }
      };
      
      fetchProfiles();
    }
  }, [profiles.length]);
  const isArtistView = window.location.pathname.startsWith('/artist/');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    console.log('🔄 FeedbackModal: Checking for submission updates');
    console.log('Current submission ID:', currentSubmission.id);
    console.log('Total submissions in store:', submissions.length);
    const updatedSubmission = submissions.find(s => s.id === currentSubmission.id);
    if (updatedSubmission) {
      console.log('✅ Found updated submission with', updatedSubmission.messages?.length || 0, 'messages');
      console.log('Messages:', updatedSubmission.messages);
      setCurrentSubmission(updatedSubmission);
    } else {
      console.log('❌ No matching submission found in store');
    }
  }, [submissions, currentSubmission.id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [currentSubmission.messages]);

  useEffect(() => {
    if (isArtistView && currentSubmission.messages?.some(m => m.isAdmin && !m.readAt)) {
      markMessagesAsRead(currentSubmission.id.toString()).catch(console.error);
    }
  }, [isArtistView, currentSubmission.id, currentSubmission.messages, markMessagesAsRead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    // For artist view: require either notes or video URL
    // For admin view: require message text
    if (isSubmitting) return;
    
    if (isArtistView && !newMessage.trim() && !notes?.trim()) {
      setError('Please provide either a video URL or notes');
      return false;
    }
    
    if (!isArtistView && !newMessage.trim()) {
      setError('Please enter feedback text');
      return false;
    }
    
    // Check for Instagram reel URLs
    if (newMessage.includes('instagram.com') && 
        (newMessage.includes('/reel/') || newMessage.includes('/p/'))) {
      setError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
      return false;
    }
    
    // Check for Instagram reel URLs or TikTok auth codes in notes
    if (notes) {
      if (notes.includes('instagram.com') && 
          (notes.includes('/reel/') || notes.includes('/p/'))) {
        setError('Instagram URLs should be submitted in the Ad Creatives section, not here.');
        return false;
      }
      
      if (notes.trim().startsWith('#')) {
        setError('TikTok auth codes should be submitted in the Ad Creatives section, not here.');
        return false;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔔 Feedback: Submitting feedback for', currentSubmission.projectName);
      
      if (isArtistView) {
        console.log('🔔 Feedback: Artist view submission');
        
        // Only update video URL if it's provided
        if (newMessage.trim()) {
          console.log('🔔 Feedback: Updating video URL');
          const { success, error: updateError } = await updateSubmission(
            currentSubmission.id.toString(),
            { videoUrl: newMessage.trim() }, 
            false  // Don't skip WhatsApp notification
          );
  
          if (!success || updateError) {
            // Check if submission was deleted by another process
            if (updateError && updateError.message && updateError.message.includes('No submission found with the given ID')) {
              onClose();
              return;
            }
            throw updateError || new Error('Failed to update submission');
          }
        }
        console.log('🔔 Feedback: Video URL updated successfully');

        // Create a feedback message that includes the notes if provided
        let feedbackMessage;
        
        if (newMessage.trim() && notes.trim()) {
          feedbackMessage = 'I\'ve updated the video with a new version. The video URL has been updated.\n\nNotes: ' + notes.trim();
        } else if (newMessage.trim()) {
          feedbackMessage = 'I\'ve updated the video with a new version. The video URL has been updated.';
        } else {
          // Only notes provided
          feedbackMessage = notes.trim();
        }
        
        console.log('🔔 Feedback: Sending artist feedback message:', feedbackMessage.substring(0, 100) + (feedbackMessage.length > 100 ? '...' : ''));
        
        const { success: feedbackSuccess, error: feedbackError } = await addMessage(
          currentSubmission.id.toString(),
          feedbackMessage,
          false
        );

        if (!feedbackSuccess || feedbackError) {
          // Check if submission was deleted by another process
          if (feedbackError && feedbackError.message && feedbackError.message.includes('No submission found with the given ID')) {
            onClose();
            return;
          }
          if (feedbackError && feedbackError.message === 'duplicate_entry') {
            setError('This feedback message already exists. Please modify your message or try again.');
            return;
          }
          if (feedbackError && feedbackError.message === 'duplicate_message_id') {
            setError('A message with this ID already exists. Please try again.');
            return;
          }
          console.error('Error adding feedback message:', feedbackError);
          console.error('❌ Feedback: Failed to add artist feedback message');
          throw feedbackError || new Error('Failed to add artist feedback');
        } else {
          console.log('✅ Feedback: Artist feedback message sent successfully');
        }
        
        // No temporary message creation - rely on store update from addMessage
      } else {
        console.log('🔔 Feedback: Admin view submission');
        const formattedMessage = formatFeedbackMessage(newMessage);
        console.log('🔔 Feedback: Sending admin feedback message:', formattedMessage.substring(0, 100) + (formattedMessage.length > 100 ? '...' : ''));
        
        const { success: feedbackSuccess, error: feedbackError } = await addMessage(
          currentSubmission.id.toString(),
          formattedMessage,
          true
        );

        if (!feedbackSuccess || feedbackError) {
          // Check if submission was deleted by another process
          if (feedbackError && feedbackError.message && feedbackError.message.includes('No submission found with the given ID')) {
            onClose();
            return;
          }
          if (feedbackError && feedbackError.message === 'duplicate_entry') {
            setError('This feedback message already exists. Please modify your message or try again.');
            return;
          }
          if (feedbackError && feedbackError.message === 'duplicate_message_id') {
            setError('A message with this ID already exists. Please try again.');
            return;
          }
          console.error('❌ Feedback: Failed to add admin feedback message');
          throw feedbackError || new Error('Failed to add admin feedback');
        } else {
          console.log('✅ Feedback: Admin feedback message sent successfully');
        }
        
        // No temporary message creation - rely on store update from addMessage
      }

      setNewMessage('');
      setNotes('');
      
      // Refresh the submissions list to show updated status
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      console.error('❌ Feedback: Error in feedback submission:', err);
      console.error('Error in feedback submission:', err);
      // Check if submission was deleted by another process
      if (err instanceof Error && err.message.includes('No submission found with the given ID')) {
        onClose();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReady = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setConfirmReady(false);
      
      // Update the submission status
      // updateSubmission will handle the WhatsApp notification automatically
      const { success, error: updateError } = await updateSubmission(
        currentSubmission.id.toString(),
        { status: 'ready' },
        false  // Don't skip WhatsApp notification - updateSubmission will send it
      );

      if (!success || updateError) {
        // Check if submission was deleted by another process
        if (updateError && updateError.message && updateError.message.includes('No submission found with the given ID')) {
          onClose();
          return;
        }
        throw updateError || new Error('Failed to mark as ready');
      }
      
      // Refresh the submissions list to show updated status
      if (onUpdate) {
        await onUpdate();
      }

      onClose();
    } catch (err) {
      console.error('Error marking as ready:', err);
      // Check if submission was deleted by another process
      if (err instanceof Error && err.message.includes('No submission found with the given ID')) {
        onClose();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to mark as ready');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setConfirmDelete({ isOpen: false, messageId: null });

      const { success, error: deleteError } = await deleteMessage(currentSubmission.id.toString(), messageId);
      if (!success || deleteError) {
        throw deleteError || new Error('Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sharedProps = {
    submission: currentSubmission,
    isArtistView,
    error,
    newMessage,
    notes,
    isSubmitting,
    hoveredMessageId,
    chatRef,
    onMessageChange: setNewMessage,
    onNotesChange: setNotes,
    onSubmit: handleSubmit,
    onMessageHover: setHoveredMessageId,
    onDeleteMessage: async (id: string) => setConfirmDelete({ isOpen: true, messageId: id }),
    onMarkAsReady: () => setConfirmReady(true),
    artistAvatar: artistAvatar || undefined,
    profiles
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#121313] rounded-lg w-[90vw] max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {currentSubmission.projectName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-2.5">
          {isMobile ? (
            <MobileLayout {...sharedProps} />
          ) : (
            <DesktopLayout {...sharedProps} />
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => confirmDelete.messageId && handleDeleteMessage(confirmDelete.messageId)}
        onCancel={() => setConfirmDelete({ isOpen: false, messageId: null })}
        isLoading={isSubmitting}
      />
      
      <ConfirmationModal
        isOpen={confirmReady}
        title="Mark as Ready"
        message="Are you sure you want to mark this video as ready? This will indicate that no further feedback is needed."
        confirmLabel="Mark as Ready"
        onConfirm={handleMarkAsReady}
        onCancel={() => setConfirmReady(false)}
        isLoading={isSubmitting}
      />
    </div>
  );
};