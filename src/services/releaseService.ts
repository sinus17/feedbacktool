import { createClient } from '@supabase/supabase-js';
import { supabase as feedbackSupabase } from '../lib/supabase';

// Reporting database (for releases sync) - only create ONE additional client
const reportingSupabase = createClient(
  'https://uydhsjvwrgupgfjevqsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZGhzanZ3cmd1cGdmamV2cXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NDAzNjcsImV4cCI6MjA0ODExNjM2N30.xfCQFURkzjvBrVnF5ap5OAytCmo3cWqM7PmIcBTVZLk'
);

export interface Release {
  id: string;
  title: string;
  artist_id?: string;
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
      console.log('Fetching releases from reporting database...');
      
      // Fetch releases from the correct table structure
      const { data: allReleases, error: fetchError } = await reportingSupabase
        .from('releases')
        .select('id, name, artist, release_date, status')
        .order('release_date', { ascending: false });
      
      if (fetchError) {
        console.error('Error fetching releases:', fetchError);
        return [];
      }
      
      console.log('Releases fetch successful:', allReleases?.length || 0);
      
      // Map the data to our expected format
      return (allReleases || []).map((release: any) => ({
        id: release.id,
        title: release.name || 'Unknown Release',
        artist_name: release.artist || 'Unknown Artist',
        release_date: release.release_date,
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
        .select('id, name, artist, release_date, status')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching release from reporting database:', error);
        return null;
      }
      
      return {
        id: data.id,
        title: data.name || 'Unknown Release',
        artist_name: data.artist || 'Unknown Artist',
        release_date: data.release_date,
        status: data.status || 'unknown'
      };
    } catch (error) {
      console.error('Error connecting to reporting database:', error);
      return null;
    }
  }
}
