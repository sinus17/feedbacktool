import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { VideoSubmission } from '../types';

export interface ContentPlanPost {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resourceId?: string; // Artist ID
  submissionId?: string;
  status: VideoSubmission['status'];
  type: VideoSubmission['type'];
  videoUrl?: string;
  color?: string;
  notes?: string | null;
}

interface ContentPlanState {
  posts: ContentPlanPost[];
  loading: boolean;
  error: string | null;
  selectedDate: Date;
  selectedArtistId: string | null;
  
  setSelectedDate: (date: Date) => void;
  setSelectedArtistId: (artistId: string | null) => void;
  
  fetchPosts: (artistId?: string) => Promise<void>;
  addPost: (post: Omit<ContentPlanPost, 'id'>) => Promise<void>;
  updatePost: (id: string, updates: Partial<ContentPlanPost>) => Promise<void>;
  deletePost: (id: string, resetStatus?: boolean) => Promise<void>;
  movePost: (id: string, newStart: Date) => Promise<void>;
  
  getPostsByDate: (date: Date) => ContentPlanPost[];
  getPostsByArtist: (artistId: string) => ContentPlanPost[];
  getReadySubmissions: (artistId: string) => Promise<VideoSubmission[]>;
}

export const useContentPlanStore = create<ContentPlanState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  selectedDate: new Date(),
  selectedArtistId: null,
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedArtistId: (artistId) => set({ selectedArtistId: artistId }),
  
  fetchPosts: async (artistId) => {
    try {
     // Prevent infinite loops by checking if already loading
     if (get().loading) return;
     
      set({ loading: true, error: null });
      
      let query = supabase
        .from('content_plan_posts')
        .select(`
          id,
          submission_id,
          artist_id,
          scheduled_date,
          status,
          notes,
          submissions (
            id,
            project_name,
            video_url,
            type,
            status
          )
        `)
        .eq('status', 'scheduled');
      
      if (artistId) {
        query = query.eq('artist_id', artistId);
      } else if (get().selectedArtistId) {
        query = query.eq('artist_id', get().selectedArtistId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const posts: ContentPlanPost[] = (data || []).map((post: any) => {
        const submission = post.submissions;
        
        const startDate = new Date(post.scheduled_date);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
        
        let color;
        if (submission.type === 'song-specific') {
          color = '#3b82f6';
        } else {
          color = '#8b5cf6';
        }
        
        return {
          id: post.id,
          title: submission.project_name,
          start: startDate,
          end: endDate,
          allDay: true,
          resourceId: post.artist_id,
          submissionId: post.submission_id,
          status: submission.status,
          type: submission.type,
          videoUrl: submission.video_url,
          color,
          notes: post.notes
        };
      });
      
      set({ posts, loading: false });
    } catch (error) {
      console.error('Error fetching content plan posts:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load content plan', 
        loading: false 
      });
    }
  },
  
  addPost: async (post) => {
    try {
      // Optimistically add the post to the UI first
      const newPost: ContentPlanPost = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: post.title,
        start: post.start,
        end: post.end,
        allDay: post.allDay,
        resourceId: post.resourceId,
        submissionId: post.submissionId,
        status: post.status,
        type: post.type,
        videoUrl: post.videoUrl,
        color: post.type === 'song-specific' ? '#3b82f6' : '#8b5cf6',
        notes: post.notes
      };
      
      set(state => ({ 
        posts: [...state.posts, newPost]
      }));
      
      if (!post.submissionId || !post.resourceId) {
        throw new Error('Submission ID and Artist ID are required');
      }

      // Determine if the scheduled date is in the past
      const now = new Date();
      const isInPast = post.start < now;
      const newStatus = isInPast ? 'posted' : 'planned';
      
      // Update the submission status
      const { error: submissionError } = await supabase
        .from('submissions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.submissionId)
        .select();
      
      if (submissionError) throw submissionError;
      
      // Create a new content plan post
      const { data: createdPost, error: postError } = await supabase
        .from('content_plan_posts')
        .insert({
          submission_id: post.submissionId,
          artist_id: post.resourceId,
          scheduled_date: post.start.toISOString(),
          status: 'scheduled',
          notes: post.notes || null
        }).select();
      
      if (postError) throw postError;
      
      // Update the temporary post with the real ID from database
      if (createdPost && createdPost[0]) {
        const realPost = { ...newPost, id: createdPost[0].id };
        set(state => ({
          posts: state.posts.map(p => p.id === newPost.id ? realPost : p),
          error: null
        }));
      }
    } catch (error) {
      console.error('Error adding content plan post:', error);
      
      // Remove the optimistic post on error
      set(state => ({
        posts: state.posts.filter(p => p.id !== newPost.id),
        error: error instanceof Error ? error.message : 'Failed to add post'
      }));
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add post', 
      });
    }
  },
  
  updatePost: async (id, updates) => {
    try {
      // Optimistically update the UI first
      const currentPosts = get().posts;
      const postIndex = currentPosts.findIndex(p => p.id === id);
      
      if (postIndex !== -1) {
        const updatedPosts = [...currentPosts];
        const post = { ...updatedPosts[postIndex] };
        
        // Apply updates
        if (updates.start) {
          const endDate = new Date(updates.start);
          endDate.setHours(23, 59, 59);
          post.start = updates.start;
          post.end = endDate;
        }
        if (updates.title) post.title = updates.title;
        if (updates.notes !== undefined) post.notes = updates.notes;
        if (updates.type) post.type = updates.type;
        if (updates.videoUrl) post.videoUrl = updates.videoUrl;
        
        updatedPosts[postIndex] = post;
        set({ posts: updatedPosts });
      }

      // Get the current post to access its submission_id
      const { data: currentPost, error: fetchError } = await supabase
        .from('content_plan_posts')
        .select('submission_id, scheduled_date, artist_id')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Store the artist ID for refetching
      const artistId = currentPost.artist_id;
      
      // Update the content plan post
      const updateData: Record<string, any> = {};
      
      if (updates.start) {
        updateData.scheduled_date = updates.start.toISOString();

        // Check if the new date is in the past and update submission status accordingly
        const now = new Date();
        const isInPast = updates.start < now;
        const newStatus = isInPast ? 'posted' : 'planned';

        const { error: submissionError } = await supabase
          .from('submissions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentPost.submission_id)
          .select();

        if (submissionError) throw submissionError;
      }
      
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: postError } = await supabase
          .from('content_plan_posts')
          .update(updateData)
          .eq('id', id)
          .select();
        
        if (postError) throw postError;
      }
      
      // Update the submission if needed
      const submissionUpdates: Record<string, any> = {};
      
      if (updates.title) submissionUpdates.project_name = updates.title;
      if (updates.videoUrl) submissionUpdates.video_url = updates.videoUrl;
      if (updates.type) submissionUpdates.type = updates.type;
      
      if (Object.keys(submissionUpdates).length > 0) {
        submissionUpdates.updated_at = new Date().toISOString();
        
        const { error: submissionError } = await supabase
          .from('submissions')
          .update(submissionUpdates)
          .eq('id', currentPost.submission_id)
          .select();
        
        if (submissionError) throw submissionError;
      }
      
      // Confirm the update in the store (no need to refetch)
      set({ error: null });
    } catch (error) {
      console.error('Error updating content plan post:', error);
      
      // Revert the optimistic update on error
      await get().fetchPosts(get().selectedArtistId || undefined);
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update post', 
      });
    }
  },
  
  movePost: async (id, newStart) => {
    try {
      // Optimistically update the UI first
      const currentPosts = get().posts;
      const postIndex = currentPosts.findIndex(p => p.id === id);
      
      if (postIndex !== -1) {
        const updatedPosts = [...currentPosts];
        const post = { ...updatedPosts[postIndex] };
        
        // Update the dates
        const endDate = new Date(newStart);
        endDate.setHours(23, 59, 59);
        post.start = newStart;
        post.end = endDate;
        
        updatedPosts[postIndex] = post;
        set({ posts: updatedPosts });
      }

      // Get the current post
      const { data: currentPost, error: fetchError } = await supabase
        .from('content_plan_posts')
        .select('artist_id, submission_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Check if the new date is in the past
      const now = new Date();
      const isInPast = newStart < now;
      const newStatus = isInPast ? 'posted' : 'planned';

      // Update the submission status
      const { error: submissionError } = await supabase
        .from('submissions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPost.submission_id)
        .select();

      if (submissionError) throw submissionError;
      
      // Update the post's scheduled date
      const { error: updateError } = await supabase
        .from('content_plan_posts')
        .update({
          scheduled_date: newStart.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (updateError) throw updateError;
      
      // Update the post in the store with the confirmed data
      const updatedPosts = get().posts.map(post => {
        if (post.id === id) {
          const endDate = new Date(newStart);
          endDate.setHours(23, 59, 59);
          return {
            ...post,
            start: newStart,
            end: endDate
          };
        }
        return post;
      });
      
      set({ posts: updatedPosts, error: null });
    } catch (error) {
      console.error('Error moving content plan post:', error);
      
      // Revert the optimistic update on error
      await get().fetchPosts(get().selectedArtistId || undefined);
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to move post', 
      });
    }
  },
  
  deletePost: async (id, resetStatus = true) => {
    try {
     console.log('🗑️ ContentPlan: Starting deletePost for ID:', id, 'resetStatus:', resetStatus);
     
      // Optimistically remove the post from UI first
      const currentPosts = get().posts;
      const postToDelete = currentPosts.find(p => p.id === id);
      
     console.log('🗑️ ContentPlan: Found post to delete:', postToDelete);
     
      if (postToDelete) {
        set(state => ({
          posts: state.posts.filter(p => p.id !== id)
        }));
      }
      
      // Get the post to access its submission_id
      const { data: post, error: fetchError } = await supabase
        .from('content_plan_posts')
        .select('submission_id, artist_id')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
     console.log('🗑️ ContentPlan: Retrieved post data:', post);
     
     // Get current submission status first
     const { data: currentSubmission, error: getCurrentError } = await supabase
       .from('submissions')
       .select('id, status, project_name')
       .eq('id', post.submission_id)
       .single();
     
     if (getCurrentError) {
       console.error('🗑️ ContentPlan: Error getting current submission:', getCurrentError);
       throw getCurrentError;
     }
     
     console.log('🗑️ ContentPlan: Current submission before update:', currentSubmission);
     
     // Always reset submission status to ready when removing from content plan
     console.log('🗑️ ContentPlan: Updating submission status to ready for:', post.submission_id);
     const { data: updateResult, error: submissionError } = await supabase
       .from('submissions')
       .update({
         status: 'ready',
         updated_at: new Date().toISOString()
       })
       .eq('id', post.submission_id)
       .select('id, status, project_name');
     
     if (submissionError) {
       console.error('🗑️ ContentPlan: Error resetting submission status:', submissionError);
       throw submissionError;
     }
     
     console.log('🗑️ ContentPlan: Successfully reset submission status:', updateResult);
      
      // Delete the content plan post
     console.log('🗑️ ContentPlan: Deleting content plan post:', id);
      const { error: deleteError } = await supabase
        .from('content_plan_posts')
        .delete()
        .eq('id', id);
      
     if (deleteError) {
       console.error('🗑️ ContentPlan: Error deleting content plan post:', deleteError);
       throw deleteError;
     }
      
     console.log('🗑️ ContentPlan: Successfully deleted content plan post:', id);
     
     // Verify the submission status was actually updated
     const { data: verifySubmission, error: verifyError } = await supabase
       .from('submissions')
       .select('id, status, project_name')
       .eq('id', post.submission_id)
       .single();
     
     if (verifyError) {
       console.error('🗑️ ContentPlan: Error verifying submission status:', verifyError);
     } else {
       console.log('🗑️ ContentPlan: Final submission status after deletion:', verifySubmission);
     }
      
      // Confirm deletion (no need to refetch)
      set({ error: null });
    } catch (error) {
     console.error('🗑️ ContentPlan: Error removing content plan post:', error);
      
      // Restore the post on error
      if (postToDelete) {
        set(state => ({
          posts: [...state.posts, postToDelete].sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          )
        }));
      }
      
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove post', 
      });
    }
  },
  
  getPostsByDate: (date) => {
    const { posts } = get();
    return posts.filter(post => {
      const postDate = new Date(post.start);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  },
  
  getPostsByArtist: (artistId) => {
    const { posts } = get();
    return posts.filter(post => post.resourceId === artistId);
  },
  
  getReadySubmissions: async (artistId) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          project_name,
          video_url,
          artist_id,
          type,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'ready')
        .eq('artist_id', artistId);
      
      if (error) throw error;
      
      return (data || []).map((submission: any) => ({
        id: submission.id,
        projectName: submission.project_name,
        videoUrl: submission.video_url,
        artistId: submission.artist_id,
        type: submission.type,
        status: submission.status,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at
      }));
    } catch (error) {
      console.error('Error fetching ready submissions:', error);
      return [];
    }
  }
}));