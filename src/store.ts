import { create } from 'zustand';
import { supabase } from './lib/supabase';
import type { VideoSubmission, Artist, AdCreative } from './types';

// Utility functions
const isSupabaseStorageUrl = (url: string): boolean => {
  return url.includes('supabase.co/storage/v1/object/public/');
};

const deleteVideoFromStorage = async (url: string): Promise<void> => {
  // Extract file path from Supabase storage URL
  const urlParts = url.split('/storage/v1/object/public/');
  if (urlParts.length < 2) return;
  
  const [bucket, ...pathParts] = urlParts[1].split('/');
  const filePath = pathParts.join('/');
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
    
  if (error) throw error;
};

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
  fetchAdCreatives: (page?: number, limit?: number, filters?: {
    artistId?: string;
    platform?: string;
    status?: string;
  }) => Promise<void>;
  
  addSubmission: (submission: Omit<VideoSubmission, 'id' | 'messages' | 'createdAt' | 'updatedAt'>) => Promise<{ data?: VideoSubmission; error?: Error }>;
  updateSubmission: (id: string, updates: Partial<VideoSubmission>, skipNotification?: boolean, isArtistUpdate?: boolean) => Promise<{ success: boolean; error?: Error }>;
  deleteSubmission: (id: string) => Promise<void>;
  
  addArtist: (artist: Omit<Artist, 'id' | 'submissions' | 'lastSubmission'>) => Promise<void>;
  updateArtist: (id: string | number, updates: Partial<Artist>) => Promise<{ error?: Error }>;
  deleteArtist: (id: string) => Promise<void>;
  
  updateFeedback: (submissionId: string | number, message: string, isAdmin: boolean) => Promise<{ success: boolean; error?: Error }>;
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

const useStore = create<StoreState>((set, get) => ({
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
        query = query.eq('artist_id' as any, filters.artistId as any);
      }
      if (filters.type) {
        query = query.eq('type' as any, filters.type as any);
      }
      if (filters.status) {
        query = query.eq('status' as any, filters.status as any);
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
  fetchAdCreatives: async (page = 1, limit = 50, filters = {}) => {
    try {
      set({ loading: true, error: null });

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('ad_creatives')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.artistId) {
        query = query.eq('artists_id' as any, filters.artistId as any);
      }
      if (filters.platform) {
        query = query.eq('platform' as any, filters.platform as any);
      }
      if (filters.status) {
        query = query.eq('status' as any, filters.status as any);
      } else {
        // If no status filter is selected, exclude archived items by default
        query = query.neq('status' as any, 'archived' as any);
      }

      const { data, error, count } = await query
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
          status: submissionData.status,
          notes: submissionData.notes,
        } as any)
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

      if (!data) {
        throw new Error('No data returned from submission creation');
      }

      const transformedSubmission: VideoSubmission = {
        id: (data as any).id,
        projectName: (data as any).project_name,
        videoUrl: (data as any).video_url,
        artistId: (data as any).artist_id,
        type: (data as any).type,
        status: (data as any).status,
        notes: (data as any).notes,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
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
          // WhatsApp notifications would be sent here
          console.log('Would send WhatsApp notification for submission update:', transformedSubmission.id);
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
        .eq('id' as any, id as any)
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

      if (!data) {
        throw new Error('No data returned from submission update');
      }

      const transformedSubmission: VideoSubmission = {
        id: (data as any).id,
        projectName: (data as any).project_name,
        videoUrl: (data as any).video_url,
        artistId: (data as any).artist_id,
        type: (data as any).type,
        status: (data as any).status,
        notes: (data as any).notes,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
        messages: ((data as any).messages || []).map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          isAdmin: msg.is_admin,
          videoUrl: msg.video_url,
          createdAt: msg.created_at,
          readAt: msg.read_at,
          updatedAt: msg.updated_at
        }))
      };

      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === id.toString() ? transformedSubmission : sub
        ),
        loading: false
      }));

      // Automatically create ad creative if song-specific video is set to ready
      if (updates.status === 'ready' && transformedSubmission.type === 'song-specific') {
        try {
          console.log('🎯 Auto-creating ad creative for song-specific video:', transformedSubmission.projectName);
          
          // Check if ad creative already exists for this submission
          const existingAdCreative = get().adCreatives.find(ac => ac.submissionId === transformedSubmission.id.toString());
          
          if (!existingAdCreative) {
            const { data: adCreativeData, error: adCreativeError } = await supabase
              .from('ad_creatives')
              .insert({
                artists_id: transformedSubmission.artistId,
                platform: 'Instagram',
                content: transformedSubmission.projectName,
                status: 'draft',
                video_name: transformedSubmission.projectName,
                submission_id: transformedSubmission.id,
              } as any)
              .select()
              .single();

            if (adCreativeError) {
              if (adCreativeError.code === '23505' && adCreativeError.message.includes('ad_creatives_content_key')) {
                console.log('Ad creative already exists for this content URL');
              } else {
                throw adCreativeError;
              }
            } else if (adCreativeData) {
              console.log('✅ Successfully created ad creative:', (adCreativeData as any).id);
              
              const transformedCreative: AdCreative = {
                id: (adCreativeData as any).id,
                createdAt: (adCreativeData as any).created_at,
                artists_id: (adCreativeData as any).artists_id,
                platform: (adCreativeData as any).platform,
                content: (adCreativeData as any).content,
                status: (adCreativeData as any).status,
                rejectionReason: (adCreativeData as any).rejection_reason,
                updatedAt: (adCreativeData as any).updated_at,
                videoName: (adCreativeData as any).video_name,
                mergedInstagramReelUrl: (adCreativeData as any).merged_instagram_reel_url,
                mergedTiktokAuthCode: (adCreativeData as any).merged_tiktok_auth_code,
                submissionId: (adCreativeData as any).submission_id,
                thumbnail_url: (adCreativeData as any).thumbnail_url,
                instagram_thumbnail_url: (adCreativeData as any).instagram_thumbnail_url,
                tiktok_thumbnail_url: (adCreativeData as any).tiktok_thumbnail_url
              };

              set(state => ({
                adCreatives: [transformedCreative, ...state.adCreatives]
              }));
            }
          } else {
            console.log('Ad creative already exists for this submission');
          }
        } catch (adCreativeError) {
          console.error('Error auto-creating ad creative:', adCreativeError);
        }
      }

      // Send WhatsApp notification if not skipped
      if (!skipNotification) {
        try {
          const artist = get().artists.find(a => a.id === transformedSubmission.artistId);
          if (artist) {
            const { WhatsAppService } = await import('./services/whatsapp');
            if (isArtistUpdate) {
              await WhatsAppService.notifyArtist({
                artist,
                submission: transformedSubmission,
                feedback: `Status updated to: ${transformedSubmission.status}`,
                status: transformedSubmission.status
              });
            } else {
              await WhatsAppService.notifyTeam({
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
        .eq('id' as any, id as any);

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
          archived: artistData.archived || false
        } as any)
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

      if (!data) {
        throw new Error('No data returned from artist creation');
      }

      const transformedArtist: Artist = {
        id: (data as any).id,
        name: (data as any).name,
        whatsappGroupId: (data as any).whatsapp_group_id,
        submissions: (data as any).submissions || 0,
        lastSubmission: (data as any).last_submission,
        archived: (data as any).archived || false
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
      const { data, error } = await supabase
        .from('artists')
        .select(`
          id,
          name,
          whatsapp_group_id,
          submissions,
          last_submission,
          archived
        `)
        .eq('id' as any, id as any)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Artist not found');

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.whatsappGroupId !== undefined) updateData.whatsapp_group_id = updates.whatsappGroupId;
      if (updates.archived !== undefined) updateData.archived = updates.archived;

      const { error: updateError } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id' as any, id as any);

      if (updateError) throw updateError;

      set(state => ({
        artists: state.artists.map(artist => 
          artist.id.toString() === id.toString() 
            ? { ...artist, ...updates }
            : artist
        )
      }));

      return {};
    } catch (error) {
      console.error('Error updating artist:', error);
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
        .eq('id' as any, id as any);

      if (error) throw error;

      set(state => ({
        artists: state.artists.filter(artist => artist.id.toString() !== id),
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
  updateFeedback: async (submissionId, message, isAdmin) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          submission_id: submissionId,
          text: message,
          is_admin: isAdmin,
          updated_at: new Date().toISOString()
        } as any)
        .select(`
          id,
          text,
          is_admin,
          video_url,
          created_at,
          read_at,
          updated_at
        `)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from message creation');

      const transformedMessage = {
        id: (data as any).id,
        text: (data as any).text,
        isAdmin: (data as any).is_admin,
        videoUrl: (data as any).video_url,
        createdAt: (data as any).created_at,
        readAt: (data as any).read_at,
        updatedAt: (data as any).updated_at
      };

      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === submissionId.toString()
            ? { ...sub, messages: [...sub.messages, transformedMessage] }
            : sub
        )
      }));

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
        .eq('id' as any, messageId as any)
        .eq('submission_id' as any, submissionId as any);

      if (error) throw error;

      set(state => ({
        submissions: state.submissions.map(sub => 
          sub.id.toString() === submissionId.toString()
            ? { ...sub, messages: sub.messages.filter(msg => msg.id.toString() !== messageId.toString()) }
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
        .update({ read_at: new Date().toISOString() } as any)
        .eq('submission_id' as any, submissionId as any)
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
        .insert(creatives as any)
        .select();

      if (error) throw error;
      if (!data) throw new Error('No data returned from ad creatives creation');

      const transformedCreatives: AdCreative[] = (data as any[]).map((creative: any) => ({
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

      const { data, error } = await supabase
        .from('ad_creatives')
        .update(updateData as any)
        .eq('id' as any, id as any)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('No data returned from ad creative update');

      const updatedCreative = (data as any[])[0];
      const transformedCreative: AdCreative = {
        id: updatedCreative.id,
        createdAt: updatedCreative.created_at,
        artists_id: updatedCreative.artists_id,
        platform: updatedCreative.platform,
        content: updatedCreative.content,
        status: updatedCreative.status,
        rejectionReason: updatedCreative.rejection_reason,
        updatedAt: updatedCreative.updated_at,
        videoName: updatedCreative.video_name,
        mergedInstagramReelUrl: updatedCreative.merged_instagram_reel_url,
        mergedTiktokAuthCode: updatedCreative.merged_tiktok_auth_code,
        submissionId: updatedCreative.submission_id,
        thumbnail_url: updatedCreative.thumbnail_url,
        instagram_thumbnail_url: updatedCreative.instagram_thumbnail_url,
        tiktok_thumbnail_url: updatedCreative.tiktok_thumbnail_url
      };

      set(state => ({
        adCreatives: state.adCreatives.map(creative => 
          creative.id === id ? transformedCreative : creative
        )
      }));
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
        .eq('id' as any, id as any);

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

  // Archive/unarchive ad creative
  archiveAdCreative: async (id) => {
    try {
      const creative = get().adCreatives.find(c => c.id === id);
      const newStatus = creative?.status === 'archived' ? 'pending' : 'archived';
      
      const { error } = await supabase
        .from('ad_creatives')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id' as any, id as any);

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
        } as any)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from ad creative creation');

      const transformedCreative: AdCreative = {
        id: (data as any).id,
        createdAt: (data as any).created_at,
        artists_id: (data as any).artists_id,
        platform: (data as any).platform,
        content: (data as any).content,
        status: (data as any).status,
        rejectionReason: (data as any).rejection_reason,
        updatedAt: (data as any).updated_at,
        videoName: (data as any).video_name,
        mergedInstagramReelUrl: (data as any).merged_instagram_reel_url,
        mergedTiktokAuthCode: (data as any).merged_tiktok_auth_code,
        submissionId: (data as any).submission_id,
        thumbnail_url: (data as any).thumbnail_url,
        instagram_thumbnail_url: (data as any).instagram_thumbnail_url,
        tiktok_thumbnail_url: (data as any).tiktok_thumbnail_url
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

export { useStore };