import { create } from 'zustand';
import { supabase } from './lib/supabase';
import { cache } from './lib/cache';
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
  }, skipCache?: boolean) => Promise<void>;
  fetchArtists: () => Promise<void>;
  fetchAdCreatives: (page?: number, limit?: number, filters?: {
    artistId?: string;
    platform?: string;
    status?: string;
  }) => Promise<void>;
  
  addSubmission: (submission: Omit<VideoSubmission, 'id' | 'messages' | 'createdAt' | 'updatedAt'>) => Promise<{ data?: VideoSubmission; error?: Error }>;
  updateSubmission: (id: string, updates: Partial<VideoSubmission>, skipNotification?: boolean) => Promise<{ success: boolean; error?: Error }>;
  deleteSubmission: (id: string) => Promise<void>;
  
  // Artist Actions
  addArtist: (artistData: { name: string; whatsappGroupId?: string | null; avatarUrl?: string; archived?: boolean }) => Promise<void>;
  updateArtist: (id: string, updates: Partial<Artist>) => Promise<{ error?: Error }>;
  deleteArtist: (id: string) => Promise<void>;
  
  addMessage: (submissionId: string, message: string, isAdmin?: boolean) => Promise<{ success: boolean; error?: Error }>;
  deleteMessage: (submissionId: string, messageId: string) => Promise<{ success: boolean; error?: Error }>;
  markMessagesAsRead: (submissionId: string) => Promise<void>;
  
  // Ad Creative Actions
  deleteAdCreative: (id: string) => Promise<void>;
  updateAdCreativeStatus: (id: string, status: string, rejectionReason?: string | null) => Promise<void>;
  archiveAdCreative: (id: string) => Promise<void>;
  setAdCreatives: (creatives: AdCreative[]) => Promise<AdCreative[] | undefined>;
  handleMoveToAdCreatives: (submission: VideoSubmission) => Promise<void>;
  
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
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true, // Collapsed on mobile by default
  
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
  fetchSubmissions: async (page = 1, limit = 20, filters = {}, skipCache = false) => {
    try {
      set({ loading: true, error: null });

      // Create cache key based on filters
      const cacheKey = `submissions_${page}_${limit}_${JSON.stringify(filters)}`;
      
      // Skip cache if explicitly requested (e.g., after status updates)
      if (!skipCache) {
        const cached = cache.get<any>(cacheKey);
        
        if (cached) {
          set({
            submissions: cached.submissions,
            submissionsPagination: cached.pagination,
            loading: false
          });
          return;
        }
      } else {
        // Invalidate cache when skipping
        cache.invalidate(cacheKey);
      }

      // Optimized query - only select necessary fields including messages
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
            user_id,
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

      const transformedSubmissions: VideoSubmission[] = (data || []).map((sub: any) => {
        const messages = (sub.messages || []).map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          isAdmin: msg.is_admin,
          userId: msg.user_id,
          videoUrl: msg.video_url,
          createdAt: msg.created_at,
          readAt: msg.read_at,
          updatedAt: msg.updated_at
        }));
        
        console.log(`📨 Loaded ${messages.length} messages for submission: ${sub.project_name}`);
        
        return {
          id: sub.id,
          projectName: sub.project_name,
          videoUrl: sub.video_url,
          artistId: sub.artist_id,
          type: sub.type,
          status: sub.status,
          notes: sub.notes,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
          messages
        };
      });

      // Update pagination info
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const paginationData = {
        currentPage: page,
        pageSize: limit,
        totalPages,
        totalCount
      };

      // Cache the result for 1 minute
      cache.set(cacheKey, {
        submissions: transformedSubmissions,
        pagination: paginationData
      }, 60 * 1000);

      set({
        submissions: transformedSubmissions,
        submissionsPagination: paginationData,
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
  addSubmission: async (submission: Omit<VideoSubmission, 'id' | 'messages' | 'createdAt' | 'updatedAt'>) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          project_name: submission.projectName,
          video_url: submission.videoUrl,
          artist_id: submission.artistId,
          type: submission.type,
          status: submission.status,
          notes: submission.notes,
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
        const artist = get().artists.find(a => a.id === submission.artistId);
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
  updateSubmission: async (id: string, updates: Partial<VideoSubmission>, skipNotification = false) => {
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
            user_id,
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

      // Refresh ad creatives if status changed to ready (database trigger handles creation)
      if (updates.status === 'ready' && transformedSubmission.type === 'song-specific') {
        console.log('🎯 Video set to ready, database trigger will handle ad creative creation:', transformedSubmission.projectName);
        
        // Refresh ad creatives to show any created by database trigger
        try {
          await get().fetchAdCreatives();
        } catch (refreshError) {
          console.error('Error refreshing ad creatives:', refreshError);
        }
      }

      // Send WhatsApp notification if not skipped
      if (!skipNotification) {
        try {
          const artist = get().artists.find(a => a.id === transformedSubmission.artistId);
          if (artist) {
            const { WhatsAppService } = await import('./services/whatsapp');
            // Always notify the artist (their WhatsApp group) about status changes
            // The notifyArtist function will handle team notifications internally if needed
            await WhatsAppService.notifyArtist({
              artist,
              submission: transformedSubmission,
              feedback: updates.status ? `Status updated to: ${transformedSubmission.status}` : undefined,
              status: transformedSubmission.status
            });
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
  deleteSubmission: async (id: string) => {
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
  addArtist: async (artistData: { name: string; whatsappGroupId?: string | null; avatarUrl?: string; archived?: boolean }) => {
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
  updateArtist: async (id: string, updates: Partial<Artist>) => {
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
  deleteArtist: async (id: string) => {
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
  addMessage: async (submissionId: string, message: string, isAdmin = false) => {
    try {
      // Get current user ID from auth context
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current authenticated user:', user);
      console.log('User ID from auth:', user?.id);
      
      // Always use the authenticated user's ID when available
      const userId = user?.id || null;
      // For public artist view (no auth), allow null user_id and continue
      
      console.log('Final userId for message:', userId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          submission_id: submissionId,
          text: message,
          is_admin: isAdmin,
          user_id: userId, // may be null for public artist view
          updated_at: new Date().toISOString()
        } as any)
        .select(`
          id,
          text,
          is_admin,
          user_id,
          video_url,
          created_at,
          read_at,
          updated_at
        `)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from message creation');

      console.log('Debug - Raw data from database:', data);
      console.log('Debug - user_id from database:', (data as any).user_id);

      const transformedMessage = {
        id: (data as any).id,
        text: (data as any).text,
        isAdmin: (data as any).is_admin,
        userId: (data as any).user_id,
        videoUrl: (data as any).video_url,
        createdAt: (data as any).created_at,
        readAt: (data as any).read_at,
        updatedAt: (data as any).updated_at
      };

      // Ensure userId is properly set
      if (!transformedMessage.userId) {
        console.error('Warning: Message created without userId!');
        transformedMessage.userId = userId;
      }

      console.log('Debug - Transformed message:', transformedMessage);

      set(state => {
        console.log('🔄 Store: Updating submissions with new message');
        console.log('Looking for submission ID:', submissionId);
        console.log('Current submissions count:', state.submissions.length);
        
        const updatedSubmissions = state.submissions.map(sub => {
          if (sub.id.toString() === submissionId.toString()) {
            console.log('✅ Found matching submission:', sub.projectName);
            console.log('Current messages count:', sub.messages.length);
            console.log('Adding new message:', transformedMessage);
            const updated = { ...sub, messages: [...sub.messages, transformedMessage] };
            console.log('Updated messages count:', updated.messages.length);
            return updated;
          }
          return sub;
        });
        
        console.log('🔄 Store: State update complete');
        return { submissions: updatedSubmissions };
      });

      // Send WhatsApp notification for feedback
      if (isAdmin) {
        try {
          console.log('🔔 Attempting to send WhatsApp notification for feedback...');
          const submission = get().submissions.find(s => s.id.toString() === submissionId.toString());
          const artist = get().artists.find(a => a.id === submission?.artistId);
          
          console.log('🔔 Found submission:', submission?.projectName);
          console.log('🔔 Found artist:', artist?.name);
          console.log('🔔 Artist WhatsApp Group ID:', artist?.whatsappGroupId);
          
          if (artist && submission) {
            const { WhatsAppService } = await import('./services/whatsapp');
            await WhatsAppService.notifyArtist({
              artist,
              submission,
              feedback: message,
              status: submission.status
            });
            console.log('✅ WhatsApp notification sent for feedback on:', submission.projectName);
          } else {
            console.error('❌ Cannot send WhatsApp notification - missing artist or submission');
          }
        } catch (notifyError) {
          console.error('❌ Error sending WhatsApp notification for feedback:', notifyError);
        }
      } else {
        console.log('⚠️ Skipping WhatsApp notification - not admin message');
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
  deleteMessage: async (submissionId: string, messageId: string) => {
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
  markMessagesAsRead: async (submissionId: string) => {
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
  setAdCreatives: async (creatives: AdCreative[]) => {
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

      // Only update global state if we're in the main admin view
      // Artist views should re-fetch to maintain proper filtering
      set(state => {
        // Check if current state appears to be filtered (small count suggests filtering)
        const appearsFiltered = state.adCreatives.length < 100; // Reasonable threshold
        
        if (appearsFiltered) {
          // Don't pollute filtered state - let components re-fetch
          console.log('Store: Skipping global state update - appears to be filtered view');
          return { loading: false };
        } else {
          // Update global state for main admin view
          return {
            adCreatives: [...transformedCreatives, ...state.adCreatives],
            loading: false
          };
        }
      });

      // Return the created creatives so components can handle them appropriately
      return transformedCreatives;
    } catch (error) {
      console.error('Error adding ad creatives:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add ad creatives',
        loading: false 
      });
    }
  },

  // Update ad creative status
  updateAdCreativeStatus: async (id: string, status: string, rejectionReason: string | null = null) => {
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

      // Send WhatsApp notification for status changes
      try {
        const { artists } = get();
        const artist = artists.find(a => a.id === updatedCreative.artists_id);
        
        if (artist && artist.whatsappGroupId) {
          // Import WhatsAppService dynamically
          const { WhatsAppService } = await import('./services/whatsapp');
          
          await WhatsAppService.notifyAdCreativeUpdate({
            artistName: artist.name,
            artistId: String(artist.id),
            artistGroupId: artist.whatsappGroupId,
            platform: updatedCreative.platform,
            content: updatedCreative.content,
            status: updatedCreative.status,
            rejectionReason: rejectionReason || undefined,
            videoName: updatedCreative.video_name
          });
          
          console.log('✅ WhatsApp notification sent for ad creative status change');
        } else {
          console.log('⚠️ No WhatsApp group ID found for artist, skipping notification');
        }
      } catch (notifyError) {
        console.error('❌ Error sending WhatsApp notification:', notifyError);
        // Don't throw - notification failure shouldn't break the status update
      }
    } catch (error) {
      console.error('Error updating ad creative status:', error);
      throw error;
    }
  },

  // Delete ad creative
  deleteAdCreative: async (id: string) => {
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
  archiveAdCreative: async (id: string) => {
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
  handleMoveToAdCreatives: async (submission: VideoSubmission) => {
    try {
      // Only allow song-specific videos to be moved to ad creatives
      if (submission.type !== 'song-specific') {
        throw new Error('Only song-specific videos can be moved to Ad Creatives');
      }

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