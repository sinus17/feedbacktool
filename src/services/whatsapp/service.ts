import { WHATSAPP_CONFIG } from '../../config/whatsapp';
import type { NotificationContext, WhatsAppService as IWhatsAppService } from './types';
import { supabase } from '../../lib/supabase';

class WhatsAppServiceImpl implements IWhatsAppService {
  private readonly TEAM_GROUP_ID = import.meta.env.VITE_TEAM_GROUP_ID || '120363291976373833';
  // Notification configuration
  private readonly NOTIFICATION_RULES = {
    ADMIN_FEEDBACK_TO_ARTIST_ONLY: true,  // When admin sends feedback, only notify artist
    ARTIST_UPDATE_TO_TEAM_ONLY: true,     // When artist updates, only notify team
    AD_CREATIVE_TO_ARTIST_ONLY: true      // When ad creative is activated, only notify artist
  };

  private async logNotification(
    type: 'feedback' | 'whatsapp_message' | 'ad_creative_submission' | 'notification',
    status: 'success' | 'error' | 'info',
    message: string,
    error?: string | null,
    metadata?: any
  ) {
    try {
      await supabase.from('whatsapp_logs').insert({
        type,
        status,
        message,
        error: error ? String(error) : null,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          config: {
            apiUrl: WHATSAPP_CONFIG.API_URL,
            hasToken: !!WHATSAPP_CONFIG.TOKEN
          }
        }
      } as any).select();
    } catch (e) {
      console.error('Error logging WhatsApp notification:', e);
    }
  }

  private async sendMessageFireAndForget(params: { groupId: string; text: string }): Promise<void> {
    try {
      // Validate and clean up group ID format
      console.log('🔔 WhatsApp: Sending message to group ID:', params.groupId, 'with text:', params.text.substring(0, 50) + '...');
      
      if (!params.groupId) {
        console.error('❌ WhatsApp: Invalid group ID - empty or undefined');
        return;
      }
      
      // Remove any non-numeric characters and trim
      const cleanGroupId = params.groupId.replace(/\D/g, '').trim();
      console.log('🔔 WhatsApp: Cleaned group ID:', cleanGroupId);
      
      // Validate the cleaned group ID
      if (!cleanGroupId || cleanGroupId.length < 15) {
        console.error('❌ WhatsApp: Group ID is too short or invalid:', params.groupId, 'cleaned:', cleanGroupId);
        return;
      }
      
      console.log('🔔 WhatsApp: Preparing to send message to:', `${cleanGroupId}@g.us`);
      console.log('🔔 WhatsApp: Message content:', params.text.substring(0, 100) + (params.text.length > 100 ? '...' : ''));

      // Check if token is available
      if (!WHATSAPP_CONFIG.TOKEN) {
        console.error('❌ WhatsApp: No API token available');
        return;
      }

      // Send message without waiting for response (fire and forget)
      fetch(`${WHATSAPP_CONFIG.API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: `${cleanGroupId}@g.us`,
          body: params.text,
          preview_url: true
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ WhatsApp: Message sent successfully (fire and forget)');
        } else {
          console.log('❌ WhatsApp: Message send failed (fire and forget):', response.status);
        }
      }).catch(error => {
        console.log('❌ WhatsApp: Message send error (fire and forget):', error.message);
      });
      
      console.log('🔔 WhatsApp: Message dispatched (not waiting for response)');
    } catch (error) {
      console.error('❌ WhatsApp: Error sending message:', error);
    }
  }

  async sendMessage(params: { groupId: string; text: string }): Promise<void> {
    // Always run in background with fire-and-forget approach
    setTimeout(() => {
      console.log('🔔 WhatsApp: sendMessage called with group ID:', params.groupId);
      this.sendMessageFireAndForget(params);
      
      // Log that message was dispatched (not waiting for response)
      this.logNotification(
        'whatsapp_message',
        'info',
        'WhatsApp message dispatched (fire and forget)',
        null,
        {
          groupId: params.groupId,
          text: params.text,
          approach: 'fire_and_forget'
        }
      ).catch(console.error);
    }, 0);
  }

  async notifyTeam(context: NotificationContext): Promise<void> {
    // Always run in background with fire-and-forget approach
    setTimeout(() => this.notifyTeamInternal(context), 0);
  }
  
  private async notifyTeamInternal(context: NotificationContext): Promise<void> {
    try {
      console.log('🔔 WhatsApp: notifyTeam called for submission:', context.submission?.projectName);
      console.log('🔔 WhatsApp: Using token:', WHATSAPP_CONFIG.TOKEN ? 'Available (hidden)' : 'Not available');
      
      // Skip team notifications when video status is set to "ready"
      const submissionStatus = context.submission?.status || '';
      if (submissionStatus === 'ready') {
        console.log('🔔 WhatsApp: Skipping team notification - status is ready (artist notification only)');
        await this.logNotification(
          'notification',
          'info',
          `Team notification skipped for ready status: ${context.submission?.projectName}`,
          undefined,
          {
            ...context,
            skipped: true,
            reason: 'Status is ready - artist notification only'
          }
        );
        return;
      }
      
      const teamGroupId = this.TEAM_GROUP_ID;
      const cleanTeamGroupId = teamGroupId ? teamGroupId.replace(/[^0-9]/g, '').trim() : '';
      
      console.log('🔔 WhatsApp: Team group ID:', teamGroupId, 'Cleaned:', cleanTeamGroupId);
      
      if (!cleanTeamGroupId || cleanTeamGroupId.length < 15) {
        console.error('❌ WhatsApp: Invalid team group ID');
        await this.logNotification(
          'notification',
          'error',
          'Failed to send team notification - Invalid team group ID',
          `Team group ID invalid: ${teamGroupId}, cleaned: ${cleanTeamGroupId}`,
          context
        );
        return;
      }

      const message = `🎥 *New Video Submission*\n\n` +
        `Artist: ${context.artist?.name || 'Unknown'}\n` +
        `Project: ${context.submission?.projectName || 'Untitled'}\n` +
        `Type: ${context.submission?.type || 'Unknown'}\n\n` +
        `Video URL: ${context.submission?.videoUrl || 'No URL'}\n\n` +
        `Status: ${context.submission?.status || 'Unknown'}`;

      console.log('🔔 WhatsApp: Sending team notification (fire and forget)');
      this.sendMessageFireAndForget({
        groupId: cleanTeamGroupId,
        text: message
      });
      
      console.log('✅ WhatsApp: Team notification dispatched');
      
      await this.logNotification(
        'notification',
        'info',
        `Team notification dispatched for submission: ${context.submission.projectName}`,
        undefined,
        context
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error);

      await this.logNotification(
        'notification',
        'error',
        'Failed to send team notification',
        errorMessage,
        {
          ...context,
          error: errorDetails
        }
      );
    }
  }

  async notifyArtist(context: NotificationContext): Promise<void> {
    // Always run in background with fire-and-forget approach
    setTimeout(() => this.notifyArtistInternal(context), 0);
  }
  
  private async notifyArtistInternal(context: NotificationContext): Promise<void> {
    const isArtistView = window.location.pathname.startsWith('/artist/');
    console.log('🔔 WhatsApp: notifyArtist called, isArtistView:', isArtistView);
    console.log('🔔 WhatsApp: Using token:', WHATSAPP_CONFIG.TOKEN ? 'Available (hidden)' : 'Not available');
    
    // Check status types
    const submissionStatus = context.submission?.status || '';
    const isReadyStatus = submissionStatus === 'ready';
    const isCorrectionNeeded = submissionStatus === 'correction-needed';
    
    // Validate context
    if (!context.artist || !context.submission) {
      console.error('❌ WhatsApp: Invalid context - missing artist or submission data', context);
      await this.logNotification(
        'feedback',
        'error',
        'Failed to send artist notification - Invalid context',
        'Missing artist or submission data',
        context
      );
      return;
    }
    
    // Check if this is an artist view (artist initiated the action)
    if (isArtistView) {
      console.log('🔔 WhatsApp: Skipping notification - artist initiated the action');
      
      // Even though we skip artist notification, we should still notify the team
      // when an artist updates a video
      try {
        // Only notify team if there's a video URL update (not just notes)
        const hasVideoUpdate = context.submission?.videoUrl && 
                              context.feedback && 
                              context.feedback.includes('updated the video with a new version');
        
        if (!hasVideoUpdate) {
          console.log('🔔 WhatsApp: Skipping team notification - no video URL update detected');
          return;
        }
        
        const teamGroupId = this.TEAM_GROUP_ID;
        const cleanTeamGroupId = teamGroupId ? teamGroupId.replace(/[^0-9]/g, '').trim() : '';
        console.log('🔔 WhatsApp: Team group ID for artist update:', teamGroupId, 'Cleaned:', cleanTeamGroupId);
        
        if (cleanTeamGroupId && cleanTeamGroupId.length >= 15) {
          const teamMessage = `📝 *Artist Updated Video*\n\n` +
            `Artist: ${context.artist.name}\n` +
            `Project: ${context.submission.projectName}\n` +
            `Type: ${context.submission.type.replace('-', ' ')}\n\n` +
            `Video URL: ${context.submission.videoUrl}\n\n` +
            `Status: ${context.submission.status}\n\n` +
            `🔗 View details: https://tool.swipeup-marketing.com/`;
          
          console.log('🔔 WhatsApp: Sending team notification for artist video update (fire and forget)');
          this.sendMessageFireAndForget({
            groupId: cleanTeamGroupId,
            text: teamMessage
          });
          console.log('🔔 WhatsApp: Team notification dispatched for artist update');
          
          await this.logNotification(
            'feedback',
            'info',
            `Team notification dispatched for artist video update: ${context.submission.projectName}`,
            undefined,
            {
              ...context,
              teamGroupId
            }
          );
        }
      } catch (teamError) {
        console.error('❌ WhatsApp: Error sending team notification for artist update:', teamError);
        await this.logNotification(
          'feedback',
          'error',
          'Failed to send team notification for artist update',
          teamError instanceof Error ? teamError.message : 'Unknown error',
          context
        );
      }
      
      await this.logNotification(
          'feedback',
          'info',
          'Skipped artist notification - artist initiated the action',
          null,
          {
            ...context,
            skipped: true,
            reason: 'Artist initiated action'
          }
        );
      
      // If artist initiated and we're using the new notification rules,
      // we should only notify the team, not the artist
      if (this.NOTIFICATION_RULES.ARTIST_UPDATE_TO_TEAM_ONLY) {
        // Only notify team if there's a video URL update (not just notes)
        const hasVideoUpdate = context.submission?.videoUrl && 
                              context.feedback && 
                              context.feedback.includes('updated the video with a new version');
        
        if (!hasVideoUpdate) {
          console.log('🔔 WhatsApp: Skipping team notification - no video URL update detected');
          return;
        }
        
        const teamGroupId = this.TEAM_GROUP_ID;
        const cleanTeamGroupId = teamGroupId ? teamGroupId.replace(/[^0-9]/g, '').trim() : '';
        console.log('🔔 WhatsApp: Team group ID for artist update:', teamGroupId, 'Cleaned:', cleanTeamGroupId);
        
        if (cleanTeamGroupId && cleanTeamGroupId.length >= 15) {
          const teamMessage = `📝 *Artist Updated Video*\n\n` +
            `Artist: ${context.artist.name}\n` +
            `Project: ${context.submission.projectName}\n` +
            `Type: ${context.submission.type.replace('-', ' ')}\n\n` +
            `Video URL: ${context.submission.videoUrl}\n\n` +
            `Status: ${context.submission.status.replace('-', ' ')}\n\n` +
            `🔗 View details: https://tool.swipeup-marketing.com/`;
          
          console.log('🔔 WhatsApp: Sending team notification for artist video update (fire and forget)');
          this.sendMessageFireAndForget({
            groupId: cleanTeamGroupId,
            text: teamMessage
          });
          console.log('🔔 WhatsApp: Team notification dispatched for artist update');
          
          await this.logNotification(
            'feedback',
            'info',
            `Team notification dispatched for artist video update: ${context.submission.projectName}`,
            undefined,
            {
              ...context,
              teamGroupId
            }
          );
        }
        
        return;
      }
    }
    
    // Clean and validate the artist's WhatsApp group ID
    const artistGroupId = context.artist.whatsappGroupId;
    const cleanArtistGroupId = artistGroupId ? artistGroupId.replace(/[^0-9]/g, '').trim() : '';
    console.log('🔔 WhatsApp: Artist group ID:', artistGroupId, 'Cleaned:', cleanArtistGroupId);
    
    if (!cleanArtistGroupId || cleanArtistGroupId.length < 15) {
      console.error('❌ WhatsApp: Invalid artist WhatsApp group ID for', context.artist.name);
      await this.logNotification(
        'feedback',
        'error',
        `Failed to send artist notification for ${context.artist.name} - Invalid WhatsApp group ID`,
        `Artist WhatsApp group ID invalid: ${artistGroupId}, cleaned: ${cleanArtistGroupId}`,
        context
      );
      return;
    }
    try {
      // Ensure we have feedback text
      const feedbackText = context.feedback || 'New feedback available';
      
      // Create status-specific messages
      let messageText = feedbackText;
      if (isReadyStatus) {
        messageText = 'Your video has been approved and is ready for use! ✅';
      } else if (isCorrectionNeeded) {
        messageText = `🔄 Correction needed for your video.\n\n${feedbackText || 'Please check the feedback and make necessary adjustments.'}`;
      }
      
      console.log('🔔 WhatsApp: Preparing artist notification for', context.artist.name);
      
      // Create the message for the artist with proper fallbacks
      const artistMessage = `📝 *New Feedback*\n\n` +
        `Project: ${context.submission.projectName}\n\n` +
        `${messageText}\n\n` +
        `Status: ${context.submission.status.replace(/-/g, ' ')}\n\n` +
        `🔗 View details: https://tool.swipeup-marketing.com/artist/${context.artist.id}`;

      // Send message to artist's group (fire and forget)
      if (cleanArtistGroupId && cleanArtistGroupId.length >= 15) {
        console.log('🔔 WhatsApp: Sending notification to artist group (fire and forget):', cleanArtistGroupId);
        this.sendMessageFireAndForget({
          groupId: cleanArtistGroupId,
          text: artistMessage
        });
        console.log('🔔 WhatsApp: Artist notification dispatched');
      } else {
        console.log('🔔 WhatsApp: Skipping artist notification - group ID too short or invalid');
      }
      
      await this.logNotification(
          'feedback',
          'info',
          `Artist notification dispatched for feedback: ${context.submission.projectName}`,
          undefined,
          {
            ...context,
            artistGroupId: cleanArtistGroupId
          }
      );
      
      // If using new notification rules and this is admin feedback, 
      // we should only notify the artist, not the team
      if (this.NOTIFICATION_RULES.ADMIN_FEEDBACK_TO_ARTIST_ONLY && !isArtistView) {
        console.log('🔔 WhatsApp: Skipping team notification - admin feedback should only go to artist');
        return;
      }
      
      // Only send to team group if this is NOT a ready status and not using new rules
      // This prevents ready notifications from going to the internal team when using old rules
      // Correction-needed notifications should still go to both artist and team
      if (!isReadyStatus && feedbackText && !this.NOTIFICATION_RULES.ADMIN_FEEDBACK_TO_ARTIST_ONLY) {
        console.log('🔔 WhatsApp: Preparing team notification for admin feedback (not correction or ready)');
        try {
          const teamGroupId = this.TEAM_GROUP_ID;
          const cleanTeamGroupId = teamGroupId ? teamGroupId.replace(/[^0-9]/g, '').trim() : '';
          console.log('🔔 WhatsApp: Team group ID for admin feedback:', teamGroupId, 'Cleaned:', cleanTeamGroupId);
          
          if (cleanTeamGroupId && cleanTeamGroupId.length >= 15) {
            const teamMessage = `📝 *New Feedback Needed*\n\n` +
              `Artist: ${context.artist.name}\n` +
              `Project: ${context.submission.projectName}\n` +
              `Type: ${context.submission.type}\n\n` +
              `Status: ${context.submission.status}\n\n` +
              `🔗 View details: https://tool.swipeup-marketing.com/`;
            
            console.log('🔔 WhatsApp: Sending team notification for admin feedback (fire and forget)');
            this.sendMessageFireAndForget({
              groupId: cleanTeamGroupId,
              text: teamMessage
            });
            console.log('🔔 WhatsApp: Team admin feedback notification dispatched');
            
            await this.logNotification(
              'feedback',
              'info',
              `Team notification dispatched for admin feedback: ${context.submission.projectName}`,
              undefined,
              {
                ...context,
                teamGroupId
              }
            );
          }
        } catch (teamError) {
          console.error('❌ WhatsApp: Error sending team notification:', teamError);
          await this.logNotification(
            'feedback',
            'error',
            'Failed to send team notification',
            teamError instanceof Error ? teamError.message : 'Unknown error',
            context
          );
        }
      } else {
        console.log('🔔 WhatsApp: Skipping team notification - status is', submissionStatus);
      }
    } catch (error) {
      console.error('❌ WhatsApp: Error in notifyArtist:', error);
      await this.logNotification(
        'feedback',
        'error',
        'Failed to send artist notification',
        error instanceof Error ? error.message : 'Unknown error',
        context
      );
    }
  }

  async sendLoginCredentials(params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    isPasswordReset?: boolean;
  }): Promise<void> {
    // Always run in background with fire-and-forget approach
    setTimeout(() => this.sendLoginCredentialsInternal(params), 0);
  }
  
  private async sendLoginCredentialsInternal(params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    isPasswordReset?: boolean;
  }): Promise<void> {
    try {
      console.log('🔔 WhatsApp: sendLoginCredentials called for', params.name);
      console.log('🔔 WhatsApp: Using token:', WHATSAPP_CONFIG.TOKEN ? 'Available (hidden)' : 'Not available');
      
      // Clean and validate the phone number for WhatsApp
      const cleanPhone = params.phone.replace(/\D/g, '').trim();
      console.log('🔔 WhatsApp: Phone number:', params.phone, 'Cleaned:', cleanPhone);
      
      if (!cleanPhone || cleanPhone.length < 10) {
        console.error('❌ WhatsApp: Invalid phone number for login credentials');
        await this.logNotification(
          'notification',
          'error',
          `Failed to send login credentials to ${params.name} - Invalid phone number`,
          `Phone number invalid: ${params.phone}, cleaned: ${cleanPhone}`,
          params
        );
        return;
      }

      const actionType = params.isPasswordReset ? 'Password Reset' : 'Account Created';
      const welcomeText = params.isPasswordReset 
        ? 'Your password has been reset.'
        : 'Welcome to the Feedback Tool!';

      const message = `🔐 *${actionType}*\n\n` +
        `Hello ${params.name},\n\n` +
        `${welcomeText}\n\n` +
        `**Login Credentials:**\n` +
        `Email: ${params.email}\n` +
        `Password: ${params.password}\n\n` +
        `🔗 Login at: http://localhost:3000/login\n\n` +
        `Please change your password after your first login for security.`;

      console.log('🔔 WhatsApp: Sending login credentials to phone (fire and forget):', cleanPhone);
      
      // Send to individual phone number (not group)
      fetch(`${WHATSAPP_CONFIG.API_URL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: `${cleanPhone}@c.us`, // Individual contact format
          body: message,
          preview_url: true
        })
      }).then(response => {
        if (response.ok) {
          console.log('✅ WhatsApp: Login credentials sent successfully (fire and forget)');
        } else {
          console.log('❌ WhatsApp: Login credentials send failed (fire and forget):', response.status);
        }
      }).catch(error => {
        console.log('❌ WhatsApp: Login credentials send error (fire and forget):', error.message);
      });
      
      await this.logNotification(
        'notification',
        'info',
        `Login credentials dispatched via WhatsApp for ${params.name}`,
        undefined,
        {
          ...params,
          password: '[HIDDEN]' // Don't log the actual password
        }
      );
    } catch (error) {
      console.error('❌ WhatsApp: Error in sendLoginCredentials:', error);
      await this.logNotification(
        'notification',
        'error',
        'Failed to send login credentials via WhatsApp',
        error instanceof Error ? error.message : String(error),
        {
          ...params,
          password: '[HIDDEN]',
          error: error instanceof Error ? 
            { message: error.message, stack: error.stack } : 
            String(error)
        }
      );
    }
  }

  async notifyAdCreativeUpdate(params: {
    artistName: string;
    artistId: string;
    artistGroupId?: string | null;
    platform: string;
    content?: string;
    status: string;
    rejectionReason?: string;
    isReplacement?: boolean;
    previousContent?: string;
    videoName?: string | null;
  }): Promise<void> {
    // Always run in background with fire-and-forget approach
    setTimeout(() => this.notifyAdCreativeUpdateInternal(params), 0);
  }
  
  private async notifyAdCreativeUpdateInternal(params: {
    artistName: string;
    artistId: string;
    artistGroupId?: string | null;
    platform: string;
    content?: string;
    status: string;
    rejectionReason?: string;
    isReplacement?: boolean;
    previousContent?: string;
    videoName?: string | null;
  }): Promise<void> {
    try {
      console.log('🔔 WhatsApp: notifyAdCreativeUpdate called for', params.artistName);
      console.log('🔔 WhatsApp: Using token:', WHATSAPP_CONFIG.TOKEN ? 'Available (hidden)' : 'Not available');
      
      // If using new notification rules and this is an active status update,
      // we should only notify the artist, not the team
      if (this.NOTIFICATION_RULES.AD_CREATIVE_TO_ARTIST_ONLY && params.status === 'active') {
        console.log('🔔 WhatsApp: Using new notification rules for ad creative status change');
        
        // For Supabase storage URLs, create a more specific message
        const isSupabaseUrl = params.content && 
          params.content.includes('supabase') && 
          params.content.includes('/storage/');
        
        if (isSupabaseUrl) {
          console.log('🔔 WhatsApp: Detected Supabase storage URL for ad creative');
        }
      }
      
      // Clean and validate the artist's WhatsApp group ID
      const artistGroupId = params.artistGroupId;
      const cleanArtistGroupId = artistGroupId ? artistGroupId.replace(/[^0-9]/g, '').trim() : '';
      console.log('🔔 WhatsApp: Artist group ID for ad creative:', artistGroupId, 'Cleaned:', cleanArtistGroupId);
      
      if (!cleanArtistGroupId || cleanArtistGroupId.length < 15) {
        console.error('❌ WhatsApp: Invalid artist WhatsApp group ID for ad creative update');
        // Log the missing group ID but continue with the function
        // to handle other notification logic
        await this.logNotification(
          'ad_creative_submission',
          'error',
          `Failed to send ad creative update notification for ${params.artistName} - Invalid WhatsApp group ID`,
          `Artist WhatsApp group ID invalid: ${artistGroupId}, cleaned: ${cleanArtistGroupId}`,
          params
        );
        return;
      }

      let statusText = 'Unknown';
      switch (params.status) {
        case 'active':
          statusText = 'Approved ✅';
          break;
        case 'rejected':
          statusText = 'Rejected ❌';
          break;
        case 'pending':
          statusText = 'Pending Review 🔄';
          break;
        case 'archived':
          statusText = 'Archived 📦';
          break;
      }
     
      // Determine if this is a replacement notification
      const replacementText = params.isReplacement && params.previousContent
        ? `\n\n*Previous ${params.platform} content has been replaced:*\n${params.previousContent}`
        : ''; 
      
      // Prepare video name text if available
      const videoNameText = params.videoName && params.videoName.trim()
        ? `Video: ${params.videoName.trim()}\n`
        : ''; 
      
      console.log('🔔 WhatsApp: Preparing ad creative notification with video name:', params.videoName);

      // Only send to artist's WhatsApp group if a group ID is provided
      if (cleanArtistGroupId && cleanArtistGroupId.length >= 15) {
        // Create a more specific message for active status
        const isSupabaseUrl = params.content && 
          params.content.includes('supabase') && 
          params.content.includes('/storage/');
        
        const message = params.status === 'active' 
          ? `✅ *Video Approved*\n\n` +
            (videoNameText || '') +
            `Platform: ${params.platform.charAt(0).toUpperCase() + params.platform.slice(1)}\n` +
            (isSupabaseUrl ? `Your video has been approved and is ready to use.\n` : 
             `Content: ${params.content || 'Not specified'}\n\nYour ad creative has been approved and is ready to use.\n`) +
            replacementText +
            `\n🔗 View details: https://tool.swipeup-marketing.com/artist/${params.artistId}/ad-creatives`
          : `🎥 *Ad Creative Update*\n\n` +
          (videoNameText || '') +
          `Platform: ${params.platform.charAt(0).toUpperCase() + params.platform.slice(1)}\n` +
          `Content: ${params.content || 'Not specified'}\n\n` +
          `Status: ${statusText}\n` +
          (params.rejectionReason ? `\nReason: ${params.rejectionReason}\n` : '') +
          replacementText +
          `\n🔗 View details: https://tool.swipeup-marketing.com/artist/${params.artistId}/ad-creatives`;

        console.log('🔔 WhatsApp: Sending ad creative notification to artist for status (fire and forget):', params.status);
        this.sendMessageFireAndForget({
          groupId: cleanArtistGroupId,
          text: message
        });
        console.log('🔔 WhatsApp: Ad creative notification dispatched');
        
        await this.logNotification(
          'ad_creative_submission',
          'info',
          `Artist notification dispatched for ad creative update: ${params.content}`,
          undefined,
          params
        );
      } else {
        // Log that we couldn't send to artist
        console.error('❌ WhatsApp: Could not send ad creative notification - invalid group ID');
        await this.logNotification(
          'ad_creative_submission',
          'error',
          `Failed to send ad creative update notification for ${params.artistName} - Invalid WhatsApp group ID`,
          `Artist WhatsApp group ID invalid: ${artistGroupId}, cleaned: ${cleanArtistGroupId}`,
          params
        );
      }
      
      // If using new notification rules and this is an active status update,
      // we should only notify the artist, not proceed with any team notifications
      if (this.NOTIFICATION_RULES.AD_CREATIVE_TO_ARTIST_ONLY && params.status === 'active') {
        console.log('🔔 WhatsApp: Skipping any further notifications - only artist should be notified for active status');
        return;
      }
    } catch (error) {
      console.error('❌ WhatsApp: Error in notifyAdCreativeUpdate:', error);
      await this.logNotification(
        'ad_creative_submission',
        'error',
        'Failed to send ad creative update notification',
        error instanceof Error ? error.message : String(error),
        {
          ...params,
          error: error instanceof Error ? 
            { message: error.message, stack: error.stack } : 
            String(error)
        }
      );
    }
  }
}

export const WhatsAppService = new WhatsAppServiceImpl();