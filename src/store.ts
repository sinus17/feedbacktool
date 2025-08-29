import { create } from 'zustand';
import { supabase } from './lib/supabase';
import { isSupabaseStorageUrl, deleteVideoFromStorage } from './utils/video/player';
import type { VideoSubmission, Message, Artist, AdCreative } from './types';

interface StoreState {
  // Data
  submissions: VideoSubmission[];
  artists: Artist[];
  adCreatives: AdCreative[];
  
  // UI State
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  
  // Pagination
  submissionsPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };
  
  adCreativesPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  };

  // Actions
  fetchSubmissions: (page?: number, limit?: number, filters?: {
    artistId?: string;
    type?: string;
    status?: string;
  }) => Promise<void>;
  fetchArtists: () => Promise<void>;
  fetchAdCreatives: (page?: number, limit?: number) => Promise<void>;
  
  addSubmission: (submission: Omit<VideoSubmission, 'id' | 'messages' | 'createdAt' | 'updatedAt'>) => Promise<{ data?: VideoSubmission; error?: Error }>;
  updateSubmission: (id: string, updates: Partial<VideoSubmission>, skipNotification?: boolean, isArtistUpdate?: boolean) => Promise<{ success: boolean; error?: Error }>;
  deleteSubmission: (id: string) => Promise<void>;
  
  addArtist: (artist: Omit<Artist, 'id' | 'submissions' | 'lastSubmission'>) => Promise<void>;
  updateArtist: (id: string | number, updates: Partial<Artist>) => Promise<{ error?: Error }>;
  deleteArtist: (id: string) => Promise<void>;
  
  updateFeedback: (submissionId: string | number, message: string, isAdmin: boolean, updateStatus?: boolean) => Promise<{ success: boolean; error?: Error }>;
  deleteMessage: (submissionId: string | number, messageId: string | number) => Promise<{ success: boolean; error?: Error }>;
  markMessagesAsRead: (submissionId: string | number) => Promise<void>;
  
  addAdCreatives: (creatives: any[]) => Promise<void>;
  updateAdCreativeStatus: (id: string, status: string, rejectionReason?: string) => Promise<void>;
  deleteAdCreative: (id: string) => Promise<void>;
  archiveAdCreative: (id: string) => Promise<void>;
  handleMoveToAdCreatives: (submission: VideoSubmission) => Promise<void>;
  
  // UI Actions
  toggleSidebar: () => void;
  setSubmissionsPage: (page: number) => void;
  setAdCreativesPage: (page: number) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  submissions: [],
  artists: [],
  adCreatives: [],
  loading: false,
  error: null,
  sidebarOpen: true,
  
  submissionsPagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
  },
  
  adCreativesPagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
  },

  // Fetch submissions
  fetchSubmissions: async (page = 1, limit = 20, filters = {}) => {
    try {
      set({ loading: true, error: null });

      let query = supabase
        .from('submissions')
        .select(`
          id,
          project_name,
          video_url,
          artist_id,
          type,
          status,
          notes,
          created_at,
          updated_at,
          messages (
            id,
            text,
            is_admin,
            video_url,
            created_at,
            read_at,
            updated_at
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.artistId) {
        query = query.eq('artist_id', filters.artistId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination and ordering
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const transformedSubmissions: VideoSubmission[] = (data || []).map((sub: any) => ({
        id: sub.id,
        projectName: sub.project_name,
        videoUrl: sub.video_url,
        artistId: sub.artist_id,
        type: sub.type,
        status: sub.status,
        notes: sub.notes,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
        messages: (sub.messages || []).map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          isAdmin: msg.is_admin,
          videoUrl: msg.video_url,
          createdAt: msg.created_at,
          readAt: msg.read_at,
          updatedAt: msg.updated_at
        }))
      }));

      // Update pagination info
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      set({
        submissions: transformedSubmissions,
        submissionsPagination: {
          currentPage: page,
          totalPages,
          totalCount,
          pageSize: limit,
        },
        loading: false
      });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },

  // Fetch artists
  fetchArtists: async () => {
    try {
      set({ error: null });

      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('name');

      if (error) throw error;

      const transformedArtists: Artist[] = (data || []).map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        whatsappGroupId: artist.whatsapp_group_id,
        submissions: artist.submissions || 0,
        lastSubmission: artist.last_submission,
        archived: artist.archived || false
      }));

      set({ artists: transformedArtists });
    } catch (error) {
      console.error('Error fetching artists:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch artists' });
    }
  },

  // Fetch ad creatives
  fetchAdCreatives: async (page = 1, limit = 50) => {
    try {
      set({ loading: true, error: null });

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('ad_creatives')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedCreatives: AdCreative[] = (data || []).map((creative: any) => ({
        id: creative.id,
        createdAt: creative.created_at,
        artists_id: creative.artists_id,
        platform: creative.platform,
        content: creative.content,
        status: creative.status,
        rejectionReason: creative.rejection_reason,
        updatedAt: creative.updated_at,
        videoName: creative.video_name,
        mergedInstagramReelUrl: creative.merged_instagram_reel_url,
        mergedTiktokAuthCode: creative.merged_tiktok_auth_code,
        submissionId: creative.submission_id,
        thumbnail_url: creative.thumbnail_url,
        instagram_thumbnail_url: creative.instagram_thumbnail_url,
        tiktok_thumbnail_url: creative.tiktok_thumbnail_url
      }));

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      set({
        adCreatives: transformedCreatives,
        adCreativesPagination: {
          currentPage: page,
          totalPages,
          totalCount,
          pageSize: limit,
        },
        loading: false
      });
    } catch (error) {
      console.error('Error fetching ad creatives:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch ad creatives',
        loading: false 
      });
    }
  },

  // Add submission
  addSubmission: async (submissionData) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          project_name: submissionData.projectName,
          video_url: submissionData.videoUrl,
          artist_id: submissionData.artistId,
          type: submissionData.type,
          status: submissionData.status || 'new',
          notes: submissionData.notes || null
        })
        .select(`
          id,
          project_name,
          video_url,
          artist_id,
          type,
          status,
          notes,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('submissions_pkey')) {
            throw new Error('duplicate_submission_id');
          }
          // Handle other unique constraints if they exist
          throw new Error('duplicate_entry');
        }
        throw error;
      }

      const transformedSubmission: VideoSubmission = {
        id: data.id,
        projectName: data.project_name,
        videoUrl: data.video_url,
        artistId: data.artist_id,
        type: data.type,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: []
      };

      // Add to store
      set(state => ({
        submissions: [transformedSubmission, ...state.submissions],
        loading: false
      }));

      // Send WhatsApp notification
      try {
        const artist = get().artists.find(a => a.id === submissionData.artistId);
        if (artist) {
          const { WhatsAppService } = await import('./services/whatsapp');
          await WhatsAppService.notifyTeam({
            artist,
            submission: transformedSubmission
          });
        }
      } catch (notifyError) {
        console.error('Error sending WhatsApp notification:', notifyError);
      }

      return { data: transformedSubmission };
    } catch (error) {
      console.error('Error adding submission:', error);
      set({ loading: false });
      return { error: error instanceof Error ? error : new Error('Failed to add submission') };
    }
  },

  // Update submission
  updateSubmission: async (id, updates, skipNotification = false, isArtistUpdate = false) => {
    try {
      set({ loading: true, error: null });

      const updateData: any = {};
      if (updates.projectName !== undefined) updateData.project_name = updates.projectName;
      if (updates.videoUrl !== undefined) updateData.video_url = updates.videoUrl;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          project_name,
          video_url,
          artist_id,
          type,
          status,
          notes,
          created_at,
          updated_at,
          messages (
            id,
            text,
            is_admin,
            video_url,
            created_at,
            read_at,
            updated_at
          )
        `)
        .single();

      if (error) throw error;

      const transformedSubmission: VideoSubmission = {
        id: data.id,
        projectName: data.project_name,
        videoUrl: data.video_url,
        artistId: data.artist_id,
        type: data.type,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: (data.messages || []).map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          isAdmin: msg.is_admin,
          videoUrl: msg.video_url,
          createdAt: msg.created_at,
          readAt: msg.read_at,
          updatedAt: msg.updated_at
        }))
      };

      // Update store
      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id === id ? transformedSubmission : sub
        ),
        loading: false
      }));

      // Send WhatsApp notification if not skipped
      if (!skipNotification) {
        try {
          const artist = get().artists.find(a => a.id === transformedSubmission.artistId);
          if (artist) {
            const { WhatsAppService } = await import('./services/whatsapp');
            
            if (isArtistUpdate) {
              await WhatsAppService.notifyTeam({
                artist,
                submission: transformedSubmission,
                feedback: 'Artist updated video'
              });
            } else {
              await WhatsAppService.notifyArtist({
                artist,
                submission: transformedSubmission,
                feedback: `Status updated to: ${transformedSubmission.status}`,
                status: transformedSubmission.status
              });
            }
          }
        } catch (notifyError) {
          console.error('Error sending WhatsApp notification:', notifyError);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating submission:', error);
      set({ loading: false });
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to update submission') 
      };
    }
  },

  // Delete submission
  deleteSubmission: async (id) => {
    try {
      set({ loading: true, error: null });

      // Get submission details before deletion for storage cleanup
      const submission = get().submissions.find(s => s.id.toString() === id);
      
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clean up video from storage if it's a Supabase storage URL
      if (submission?.videoUrl && isSupabaseStorageUrl(submission.videoUrl)) {
        try {
          await deleteVideoFromStorage(submission.videoUrl);
        } catch (storageError) {
          console.error('Error deleting video from storage:', storageError);
        }
      }

      set(state => ({
        submissions: state.submissions.filter(sub => sub.id.toString() !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting submission:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete submission',
        loading: false 
      });
    }
  },

  // Add artist
  addArtist: async (artistData) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('artists')
        .insert({
          name: artistData.name,
          whatsapp_group_id: artistData.whatsappGroupId,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('artists_pkey')) {
            throw new Error('duplicate_artist_id');
          }
          // Handle other unique constraints if they exist
          throw new Error('duplicate_entry');
        }
        throw error;
      }

      const transformedArtist: Artist = {
        id: data.id,
        name: data.name,
        whatsappGroupId: data.whatsapp_group_id,
        submissions: data.submissions || 0,
        lastSubmission: data.last_submission,
        archived: data.archived || false
      };

      set(state => ({
        artists: [...state.artists, transformedArtist],
        loading: false
      }));
    } catch (error) {
      console.error('Error adding artist:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add artist',
        loading: false 
      });
      throw error;
    }
  },

  // Update artist
  updateArtist: async (id, updates) => {
    try {
      set({ loading: true, error: null });

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.whatsappGroupId !== undefined) updateData.whatsapp_group_id = updates.whatsappGroupId;
      if (updates.archived !== undefined) updateData.archived = updates.archived;

      const { data, error } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const transformedArtist: Artist = {
        id: data.id,
        name: data.name,
        whatsappGroupId: data.whatsapp_group_id,
        submissions: data.submissions || 0,
        lastSubmission: data.last_submission,
        archived: data.archived || false
      };

      set(state => ({
        artists: state.artists.map(artist => 
          artist.id === id ? transformedArtist : artist
        ),
        loading: false
      }));

      // If archiving artist, also archive their submissions
      if (updates.archived === true) {
        await supabase
          .from('submissions')
          .update({ status: 'archived' })
          .eq('artist_id', id);
        
        // Refresh submissions to reflect the change
        await get().fetchSubmissions();
      }

      return {};
    } catch (error) {
      console.error('Error updating artist:', error);
      set({ loading: false });
      return { error: error instanceof Error ? error : new Error('Failed to update artist') };
    }
  },

  // Delete artist
  deleteArtist: async (id) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        artists: state.artists.filter(artist => artist.id !== id),
        submissions: state.submissions.filter(sub => sub.artistId !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting artist:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete artist',
        loading: false 
      });
    }
  },

  // Update feedback
  updateFeedback: async (submissionId, message, isAdmin, updateStatus = true) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          submission_id: submissionId,
          text: message,
          is_admin: isAdmin,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('messages_pkey')) {
            throw new Error('duplicate_message_id');
          }
          throw new Error('duplicate_entry');
        }
        throw error;
      }

      const newMessage: Message = {
        id: data.id,
        text: data.text,
        isAdmin: data.is_admin,
        videoUrl: data.video_url,
        createdAt: data.created_at,
        readAt: data.read_at,
        updatedAt: data.updated_at
      };

      // Update store
      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === submissionId.toString() 
            ? { ...sub, messages: [...(sub.messages || []), newMessage] }
            : sub
        )
      }));

      // Send WhatsApp notification
      try {
        const submission = get().submissions.find(s => s.id.toString() === submissionId.toString());
        const artist = get().artists.find(a => a.id === submission?.artistId);
        
        if (submission && artist) {
          const { WhatsAppService } = await import('./services/whatsapp');
          
          if (isAdmin) {
            await WhatsAppService.notifyArtist({
              artist,
              submission,
              feedback: message
            });
          } else {
            await WhatsAppService.notifyTeam({
              artist,
              submission,
              feedback: message
            });
          }
        }
      } catch (notifyError) {
        console.error('Error sending WhatsApp notification:', notifyError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating feedback:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to update feedback') 
      };
    }
  },

  // Delete message
  deleteMessage: async (submissionId, messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('submission_id', submissionId);

      if (error) throw error;

      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === submissionId.toString()
            ? { 
                ...sub, 
                messages: sub.messages.filter(msg => msg.id.toString() !== messageId.toString()) 
              }
            : sub
        )
      }));

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Failed to delete message') 
      };
    }
  },

  // Mark messages as read
  markMessagesAsRead: async (submissionId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('submission_id', submissionId)
        .is('read_at', null);

      if (error) throw error;

      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === submissionId.toString()
            ? {
                ...sub,
                messages: sub.messages.map(msg => ({
                  ...msg,
                  readAt: msg.readAt || new Date().toISOString()
                }))
              }
            : sub
        )
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  // Add ad creatives
  addAdCreatives: async (creatives) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('ad_creatives')
        .insert(creatives)
        .select();

      if (error) {
        // Handle unique constraint violation for duplicate content
        if (error.code === '23505' && error.message.includes('ad_creatives_content_key')) {
          throw new Error('duplicate_entry');
        }
        throw error;
      }

      const transformedCreatives: AdCreative[] = (data || []).map((creative: any) => ({
        id: creative.id,
        createdAt: creative.created_at,
        artists_id: creative.artists_id,
        platform: creative.platform,
        content: creative.content,
        status: creative.status,
        rejectionReason: creative.rejection_reason,
        updatedAt: creative.updated_at,
        videoName: creative.video_name,
        mergedInstagramReelUrl: creative.merged_instagram_reel_url,
        mergedTiktokAuthCode: creative.merged_tiktok_auth_code,
        submissionId: creative.submission_id,
        thumbnail_url: creative.thumbnail_url,
        instagram_thumbnail_url: creative.instagram_thumbnail_url,
        tiktok_thumbnail_url: creative.tiktok_thumbnail_url
      }));

      set(state => ({
        adCreatives: [...transformedCreatives, ...state.adCreatives],
        loading: false
      }));
    } catch (error) {
      console.error('Error adding ad creatives:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add ad creatives',
        loading: false 
      });
      throw error;
    }
  },

  // Update ad creative status
  updateAdCreativeStatus: async (id, status, rejectionReason) => {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('ad_creatives')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        adCreatives: state.adCreatives.map(creative => 
          creative.id === id 
            ? { 
                ...creative, 
                status: status as any,
                rejectionReason: rejectionReason || creative.rejectionReason,
                updatedAt: new Date().toISOString()
              }
            : creative
        )
      }));

      // Send WhatsApp notification for status changes
      try {
        const creative = get().adCreatives.find(c => c.id === id);
        const artist = get().artists.find(a => a.id === creative?.artists_id);
        
        if (creative && artist) {
          const { WhatsAppService } = await import('./services/whatsapp');
          await WhatsAppService.notifyAdCreativeUpdate({
            artistName: artist.name,
            artistId: artist.id.toString(),
            artistGroupId: artist.whatsappGroupId,
            platform: creative.platform,
            content: creative.content,
            status,
            rejectionReason,
            videoName: creative.videoName
          });
        }
      } catch (notifyError) {
        console.error('Error sending WhatsApp notification:', notifyError);
      }
    } catch (error) {
      console.error('Error updating ad creative status:', error);
      throw error;
    }
  },

  // Delete ad creative
  deleteAdCreative: async (id) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('ad_creatives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        adCreatives: state.adCreatives.filter(creative => creative.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting ad creative:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete ad creative',
        loading: false 
      });
    }
  },

  // Archive ad creative
  archiveAdCreative: async (id) => {
    try {
      const creative = get().adCreatives.find(c => c.id === id);
      const newStatus = creative?.status === 'archived' ? 'pending' : 'archived';
      
      const { error } = await supabase
        .from('ad_creatives')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        adCreatives: state.adCreatives.map(creative => 
          creative.id === id 
            ? { 
                ...creative, 
                status: newStatus as any,
                updatedAt: new Date().toISOString()
              }
            : creative
        )
      }));

      // Log archive action
      await supabase.from('archive_logs').insert({
        entity_type: 'ad_creative',
        entity_id: id,
        action: newStatus === 'archived' ? 'archive' : 'unarchive',
        metadata: {
          platform: creative?.platform,
          content: creative?.content,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error archiving ad creative:', error);
      throw error;
    }
  },

  // Move video to ad creatives
  handleMoveToAdCreatives: async (submission) => {
    try {
      const { data, error } = await supabase
        .from('ad_creatives')
        .insert({
          artists_id: submission.artistId,
          platform: 'dropbox',
          content: submission.videoUrl,
          status: 'pending',
          video_name: submission.projectName,
          submission_id: submission.id
        })
        .select()
        .single();

      if (error) throw error;

      const transformedCreative: AdCreative = {
        id: data.id,
        createdAt: data.created_at,
        artists_id: data.artists_id,
        platform: data.platform,
        content: data.content,
        status: data.status,
        rejectionReason: data.rejection_reason,
        updatedAt: data.updated_at,
        videoName: data.video_name,
        mergedInstagramReelUrl: data.merged_instagram_reel_url,
        mergedTiktokAuthCode: data.merged_tiktok_auth_code,
        submissionId: data.submission_id,
        thumbnail_url: data.thumbnail_url,
        instagram_thumbnail_url: data.instagram_thumbnail_url,
        tiktok_thumbnail_url: data.tiktok_thumbnail_url
      };

      set(state => ({
        adCreatives: [transformedCreative, ...state.adCreatives]
      }));
    } catch (error) {
      console.error('Error moving to ad creatives:', error);
      throw error;
    }
  },

  // UI Actions
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSubmissionsPage: (page) => set(state => ({ 
    submissionsPagination: { ...state.submissionsPagination, currentPage: page } 
  })),
  setAdCreativesPage: (page) => set(state => ({ 
    adCreativesPagination: { ...state.adCreativesPagination, currentPage: page } 
  })),
}));