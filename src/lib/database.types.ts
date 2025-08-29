export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          id: string
          created_at: string
          name: string
          element_id: string | null
          whatsapp_group_id: string | null
          whatsapp_invite_url: string | null
          submissions: number
          last_submission: string | null
          archived: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          element_id?: string | null
          whatsapp_group_id?: string | null
          whatsapp_invite_url?: string | null
          submissions?: number
          last_submission?: string | null
          archived?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          element_id?: string | null
          whatsapp_group_id?: string | null
          whatsapp_invite_url?: string | null
          submissions?: number
          last_submission?: string | null
          archived?: boolean | null
        }
      }
      submissions: {
        Row: {
          id: string
          created_at: string
          project_name: string
          video_url: string
          artist_id: string
          type: 'song-specific' | 'off-topic'
          status: 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'planned' | 'posted' | 'archived'
          updated_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_name: string
          video_url: string
          artist_id: string
          type: 'song-specific' | 'off-topic'
          status?: 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'planned' | 'posted' | 'archived'
          updated_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          project_name?: string
          video_url?: string
          artist_id?: string
          type?: 'song-specific' | 'off-topic'
          status?: 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'planned' | 'posted' | 'archived'
          updated_at?: string
          notes?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          submission_id: string
          text: string
          is_admin: boolean
          video_url: string | null
          read_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          submission_id: string
          text: string
          is_admin: boolean
          video_url?: string | null
          read_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          submission_id?: string
          text?: string
          is_admin?: boolean
          video_url?: string | null
          read_at?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string | null
          phone: string | null
          team: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          name: string
          email?: string | null
          phone?: string | null
          team?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          team?: string | null
          avatar_url?: string | null
        }
      }
      ad_creatives: {
        Row: {
          id: string
          created_at: string
          artists_id: string
          platform: string
          content: string
          status: 'pending' | 'active' | 'archived' | 'rejected'
          rejection_reason: string | null
          updated_at: string
          video_name: string | null
          merged_instagram_reel_url: string | null
          merged_tiktok_auth_code: string | null
          submission_id: string | null
          thumbnail_url: string | null
          instagram_thumbnail_url: string | null
          tiktok_thumbnail_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          artists_id: string
          platform: string
          content: string
          status?: 'pending' | 'active' | 'archived' | 'rejected'
          rejection_reason?: string | null
          updated_at?: string
          video_name?: string | null
          merged_instagram_reel_url?: string | null
          merged_tiktok_auth_code?: string | null
          submission_id?: string | null
          thumbnail_url?: string | null
          instagram_thumbnail_url?: string | null
          tiktok_thumbnail_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          artists_id?: string
          platform?: string
          content?: string
          status?: 'pending' | 'active' | 'archived' | 'rejected'
          rejection_reason?: string | null
          updated_at?: string
          video_name?: string | null
          merged_instagram_reel_url?: string | null
          merged_tiktok_auth_code?: string | null
          submission_id?: string | null
          thumbnail_url?: string | null
          instagram_thumbnail_url?: string | null
          tiktok_thumbnail_url?: string | null
        }
      }
      content_plan_posts: {
        Row: {
          id: string
          created_at: string
          submission_id: string
          artist_id: string
          scheduled_date: string
          status: 'scheduled' | 'posted' | 'archived'
          updated_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          submission_id: string
          artist_id: string
          scheduled_date: string
          status?: 'scheduled' | 'posted' | 'archived'
          updated_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          submission_id?: string
          artist_id?: string
          scheduled_date?: string
          status?: 'scheduled' | 'posted' | 'archived'
          updated_at?: string
          notes?: string | null
        }
      }
      archive_logs: {
        Row: {
          id: string
          created_at: string
          entity_type: 'artist' | 'submission' | 'ad_creative'
          entity_id: string
          action: 'archive' | 'unarchive'
          reason: string | null
          performed_by: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          entity_type: 'artist' | 'submission' | 'ad_creative'
          entity_id: string
          action: 'archive' | 'unarchive'
          reason?: string | null
          performed_by?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          entity_type?: 'artist' | 'submission' | 'ad_creative'
          entity_id?: string
          action?: 'archive' | 'unarchive'
          reason?: string | null
          performed_by?: string | null
          metadata?: Json | null
        }
      }
      whatsapp_logs: {
        Row: {
          id: string
          created_at: string
          type: string
          status: 'success' | 'error' | 'info' | 'warning'
          message: string
          error: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          type: string
          status: 'success' | 'error' | 'info' | 'warning'
          message: string
          error?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          type?: string
          status?: 'success' | 'error' | 'info' | 'warning'
          message?: string
          error?: string | null
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}