import { createClient } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

// Feedback tool database (current project)
const feedbackSupabase = createClient<Database>(
  'https://wrlgoxbzlngdtomjhvnz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTA3NzcsImV4cCI6MjA0ODA2Njc3N30.ZCAreV5YsR26maw8QrulmTq7GSXvfpYuKXP-ocTfhtk'
);

// Reporting database (for releases sync)
const reportingSupabase = createClient(
  'https://uydhsjvwrgupgfjevqsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZGhzanZ3cmd1cGdmamV2cXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NDAzNjcsImV4cCI6MjA0ODExNjM2N30.xfCQFURkzjvBrVnF5ap5OAytCmo3cWqM7PmIcBTVZLk'
);

export interface Release {
  id: string;
  title: string;
  artist_name?: string;
  release_date?: string;
  status?: string;
}

export interface ReleaseSheet {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  artist_id: string;
  release_id: string | null;
  release_title: string | null;
  content: any;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  tags: string[];
  cover_image_url: string | null;
  due_date: string | null;
  completed_at: string | null;
}

export class ReleaseService {
  // Release Sheets CRUD operations (feedback database)
  static async getReleaseSheets(artistId?: string): Promise<ReleaseSheet[]> {
    const supabase = feedbackSupabase as any;
    let query = supabase
      .from('release_sheets')
      .select('*')
      .order('created_at', { ascending: false });

    if (artistId) {
      query = query.eq('artist_id', artistId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching release sheets:', error);
      throw error;
    }
    
    return (data || []) as ReleaseSheet[];
  }

  static async getReleaseSheet(id: string): Promise<ReleaseSheet | null> {
    const supabase = feedbackSupabase as any;
    const { data, error } = await supabase
      .from('release_sheets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching release sheet:', error);
      throw error;
    }
    
    return data as ReleaseSheet | null;
  }

  static async createReleaseSheet(sheet: Omit<ReleaseSheet, 'id' | 'created_at' | 'updated_at'>): Promise<ReleaseSheet> {
    const supabase = feedbackSupabase as any;
    const { data, error } = await supabase
      .from('release_sheets')
      .insert(sheet)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating release sheet:', error);
      throw error;
    }
    
    return data as ReleaseSheet;
  }

  static async updateReleaseSheet(id: string, updates: Partial<ReleaseSheet>): Promise<ReleaseSheet> {
    const supabase = feedbackSupabase as any;
    const { data, error } = await supabase
      .from('release_sheets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating release sheet:', error);
      throw error;
    }
    
    return data as ReleaseSheet;
  }

  static async deleteReleaseSheet(id: string): Promise<void> {
    const supabase = feedbackSupabase as any;
    const { error } = await supabase
      .from('release_sheets')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting release sheet:', error);
      throw error;
    }
  }

  // Releases sync from reporting database
  static async getReleases(): Promise<Release[]> {
    try {
      // First, try to get all columns to see what's available
      const { data, error } = await reportingSupabase
        .from('releases')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error fetching releases from reporting database:', error);
        // Return empty array if table doesn't exist or there's an error
        return [];
      }
      
      // If we got data, let's see what columns are available
      if (data && data.length > 0) {
        console.log('Available columns in releases table:', Object.keys(data[0]));
      }
      
      // Now fetch all releases with basic columns that likely exist
      const { data: allReleases, error: fetchError } = await reportingSupabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Error fetching all releases:', fetchError);
        return [];
      }
      
      // Map the data to our expected format
      return (allReleases || []).map(release => ({
        id: release.id,
        title: release.name || release.title || release.release_name || 'Unknown Release',
        artist_name: release.artist_name || release.artist || 'Unknown Artist',
        release_date: release.release_date || release.created_at,
        status: release.status || 'unknown'
      }));
    } catch (error) {
      console.error('Error connecting to reporting database:', error);
      return [];
    }
  }

  static async getRelease(id: string): Promise<Release | null> {
    try {
      const { data, error } = await reportingSupabase
        .from('releases')
        .select('id, title, artist_name, release_date, status')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching release from reporting database:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error connecting to reporting database:', error);
      return null;
    }
  }
}
