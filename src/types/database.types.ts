export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_creatives: {
        Row: {
          artists_id: string
          content: string
          created_at: string
          id: string
          instagram_thumbnail_url: string | null
          language: string | null
          merged_instagram_reel_url: string | null
          merged_tiktok_auth_code: string | null
          platform: string
          rejection_reason: string | null
          status: string
          submission_id: string | null
          thumbnail_url: string | null
          tiktok_thumbnail_url: string | null
          updated_at: string
          video_name: string | null
        }
        Insert: {
          artists_id: string
          content: string
          created_at?: string
          id?: string
          instagram_thumbnail_url?: string | null
          language?: string | null
          merged_instagram_reel_url?: string | null
          merged_tiktok_auth_code?: string | null
          platform: string
          rejection_reason?: string | null
          status?: string
          submission_id?: string | null
          thumbnail_url?: string | null
          tiktok_thumbnail_url?: string | null
          updated_at?: string
          video_name?: string | null
        }
        Update: {
          artists_id?: string
          content?: string
          created_at?: string
          id?: string
          instagram_thumbnail_url?: string | null
          language?: string | null
          merged_instagram_reel_url?: string | null
          merged_tiktok_auth_code?: string | null
          platform?: string
          rejection_reason?: string | null
          status?: string
          submission_id?: string | null
          thumbnail_url?: string | null
          tiktok_thumbnail_url?: string | null
          updated_at?: string
          video_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_artists_id_fkey"
            columns: ["artists_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_posts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          performed_by: string | null
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          archived: boolean | null
          created_at: string
          element_id: string | null
          id: string
          last_submission: string | null
          name: string
          submissions: number | null
          whatsapp_group_id: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string
          element_id?: string | null
          id?: string
          last_submission?: string | null
          name: string
          submissions?: number | null
          whatsapp_group_id?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string
          element_id?: string | null
          id?: string
          last_submission?: string | null
          name?: string
          submissions?: number | null
          whatsapp_group_id?: string | null
        }
        Relationships: []
      }
      audiences: {
        Row: {
          artist_id: string
          created_at: string
          description: string | null
          id: string
          instagram_urls: string[]
          name: string
          new_column_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          description?: string | null
          id?: string
          instagram_urls: string[]
          name: string
          new_column_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          description?: string | null
          id?: string
          instagram_urls?: string[]
          name?: string
          new_column_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiences_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plan_posts: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_plan_posts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plan_posts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_genres: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          read_at: string | null
          submission_id: string
          text: string
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin: boolean
          read_at?: string | null
          submission_id: string
          text: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          read_at?: string | null
          submission_id?: string
          text?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          team: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          team?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      release_sheet_templates: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          created_at: string
          created_by_artist_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          language: string | null
          name: string
          tags: string[] | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by_artist_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          language?: string | null
          name: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by_artist_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          language?: string | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "release_sheet_templates_created_by_artist_id_fkey"
            columns: ["created_by_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      release_sheets: {
        Row: {
          artist_id: string
          completed_at: string | null
          content: Json | null
          cover_image_url: string | null
          created_at: string
          due_date: string | null
          id: string
          release_id: string | null
          release_title: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          completed_at?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          release_id?: string | null
          release_title?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          completed_at?: string | null
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          release_id?: string | null
          release_title?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_sheets_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          notes: string | null
          project_name: string
          status: string
          type: string
          updated_at: string
          video_length: number | null
          video_url: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          notes?: string | null
          project_name: string
          status?: string
          type: string
          updated_at?: string
          video_length?: number | null
          video_url: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          project_name?: string
          status?: string
          type?: string
          updated_at?: string
          video_length?: number | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      video_library: {
        Row: {
          account_name: string | null
          account_username: string | null
          actor: string | null
          anchors: Json | null
          apple_music_id: string | null
          artist_recommendation: string | null
          category: string[] | null
          challenges: Json | null
          collect_count: number | null
          comments_count: number | null
          content_description: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          creator_avatar_storage_url: string | null
          creator_avatar_url: string | null
          creator_heart_count: number | null
          creator_video_count: number | null
          description: string | null
          diversification_labels: Json | null
          duet_enabled: boolean | null
          duration: number | null
          dynamic_cover_url: string | null
          featured: boolean | null
          follower_count: number | null
          gemini_analysis: Json | null
          gemini_analyzed_at: string | null
          genre: string[] | null
          hashtags: string[] | null
          id: string
          is_ad: boolean | null
          is_original_sound: boolean | null
          is_published: boolean | null
          likes_count: number | null
          location_address: string | null
          location_city: string | null
          location_country: string | null
          location_name: string | null
          music_album: string | null
          music_author: string | null
          music_cover_large: string | null
          music_cover_medium: string | null
          music_cover_thumb: string | null
          music_is_copyrighted: boolean | null
          music_title: string | null
          music_url: string | null
          music_video_count: number | null
          platform: string
          processing_error: string | null
          processing_status: string | null
          raw_api_data: Json | null
          repost_count: number | null
          share_enabled: boolean | null
          shares_count: number | null
          source_url: string
          spotify_id: string | null
          stitch_enabled: boolean | null
          subtitles: Json | null
          suggested_words: Json | null
          tags: string[] | null
          text_extra: Json | null
          text_language: string | null
          thumbnail_storage_url: string | null
          thumbnail_url: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          upload_date: string | null
          video_bitrate: number | null
          video_codec: string | null
          video_height: number | null
          video_id: string
          video_quality: string | null
          video_url: string | null
          video_width: number | null
          views_count: number | null
          why_it_works: string | null
        }
        Insert: {
          account_name?: string | null
          account_username?: string | null
          actor?: string | null
          anchors?: Json | null
          apple_music_id?: string | null
          artist_recommendation?: string | null
          category?: string[] | null
          challenges?: Json | null
          collect_count?: number | null
          comments_count?: number | null
          content_description?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_avatar_storage_url?: string | null
          creator_avatar_url?: string | null
          creator_heart_count?: number | null
          creator_video_count?: number | null
          description?: string | null
          diversification_labels?: Json | null
          duet_enabled?: boolean | null
          duration?: number | null
          dynamic_cover_url?: string | null
          featured?: boolean | null
          follower_count?: number | null
          gemini_analysis?: Json | null
          gemini_analyzed_at?: string | null
          genre?: string[] | null
          hashtags?: string[] | null
          id?: string
          is_ad?: boolean | null
          is_original_sound?: boolean | null
          is_published?: boolean | null
          likes_count?: number | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          music_album?: string | null
          music_author?: string | null
          music_cover_large?: string | null
          music_cover_medium?: string | null
          music_cover_thumb?: string | null
          music_is_copyrighted?: boolean | null
          music_title?: string | null
          music_url?: string | null
          music_video_count?: number | null
          platform: string
          processing_error?: string | null
          processing_status?: string | null
          raw_api_data?: Json | null
          repost_count?: number | null
          share_enabled?: boolean | null
          shares_count?: number | null
          source_url: string
          spotify_id?: string | null
          stitch_enabled?: boolean | null
          subtitles?: Json | null
          suggested_words?: Json | null
          tags?: string[] | null
          text_extra?: Json | null
          text_language?: string | null
          thumbnail_storage_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          upload_date?: string | null
          video_bitrate?: number | null
          video_codec?: string | null
          video_height?: number | null
          video_id: string
          video_quality?: string | null
          video_url?: string | null
          video_width?: number | null
          views_count?: number | null
          why_it_works?: string | null
        }
        Update: {
          account_name?: string | null
          account_username?: string | null
          actor?: string | null
          anchors?: Json | null
          apple_music_id?: string | null
          artist_recommendation?: string | null
          category?: string[] | null
          challenges?: Json | null
          collect_count?: number | null
          comments_count?: number | null
          content_description?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_avatar_storage_url?: string | null
          creator_avatar_url?: string | null
          creator_heart_count?: number | null
          creator_video_count?: number | null
          description?: string | null
          diversification_labels?: Json | null
          duet_enabled?: boolean | null
          duration?: number | null
          dynamic_cover_url?: string | null
          featured?: boolean | null
          follower_count?: number | null
          gemini_analysis?: Json | null
          gemini_analyzed_at?: string | null
          genre?: string[] | null
          hashtags?: string[] | null
          id?: string
          is_ad?: boolean | null
          is_original_sound?: boolean | null
          is_published?: boolean | null
          likes_count?: number | null
          location_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_name?: string | null
          music_album?: string | null
          music_author?: string | null
          music_cover_large?: string | null
          music_cover_medium?: string | null
          music_cover_thumb?: string | null
          music_is_copyrighted?: boolean | null
          music_title?: string | null
          music_url?: string | null
          music_video_count?: number | null
          platform?: string
          processing_error?: string | null
          processing_status?: string | null
          raw_api_data?: Json | null
          repost_count?: number | null
          share_enabled?: boolean | null
          shares_count?: number | null
          source_url?: string
          spotify_id?: string | null
          stitch_enabled?: boolean | null
          subtitles?: Json | null
          suggested_words?: Json | null
          tags?: string[] | null
          text_extra?: Json | null
          text_language?: string | null
          thumbnail_storage_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          upload_date?: string | null
          video_bitrate?: number | null
          video_codec?: string | null
          video_height?: number | null
          video_id?: string
          video_quality?: string | null
          video_url?: string | null
          video_width?: number | null
          views_count?: number | null
          why_it_works?: string | null
        }
        Relationships: []
      }
      video_library_queue: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          platform: string
          processed_at: string | null
          retry_count: number | null
          source_url: string
          status: string | null
          updated_at: string | null
          video_library_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          platform: string
          processed_at?: string | null
          retry_count?: number | null
          source_url: string
          status?: string | null
          updated_at?: string | null
          video_library_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          processed_at?: string | null
          retry_count?: number | null
          source_url?: string
          status?: string | null
          updated_at?: string | null
          video_library_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_library_queue_video_library_id_fkey"
            columns: ["video_library_id"]
            isOneToOne: false
            referencedRelation: "video_library"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          message: string
          metadata: Json | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          message: string
          metadata?: Json | null
          status: string
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      workbooks: {
        Row: {
          author: string | null
          created_at: string | null
          id: number
          title: string
        }
        Insert: {
          author?: string | null
          created_at?: string | null
          id?: never
          title: string
        }
        Update: {
          author?: string | null
          created_at?: string | null
          id?: never
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_tables_exist: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_old_videos: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_tables: {
        Args: { sql_commands: string }
        Returns: undefined
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      format_whatsapp_group_id: {
        Args: { group_id: string }
        Returns: string
      }
      get_release_sheet_templates: {
        Args: { artist_id_param?: string }
        Returns: {
          content: Json
          cover_image_url: string
          created_at: string
          created_by_artist_id: string
          description: string
          id: string
          is_active: boolean
          is_public: boolean
          language: string
          name: string
          tags: string[]
          updated_at: string
          usage_count: number
        }[]
      }
      get_schema_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      insert_release_sheet_template: {
        Args: { template_data: Json }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_social_media_url: {
        Args: { url: string }
        Returns: boolean
      }
      is_supabase_storage_url: {
        Args: { url: string }
        Returns: boolean
      }
      raw_sql: {
        Args: { query: string }
        Returns: undefined
      }
      setup_database: {
        Args: { sql_commands: string }
        Returns: undefined
      }
      validate_feedback_input: {
        Args: { input: string }
        Returns: Json
      }
      validate_video_format: {
        Args: { mime_type: string }
        Returns: Json
      }
      validate_whatsapp_group_id: {
        Args: { group_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
