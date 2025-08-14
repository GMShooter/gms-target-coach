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
      model_versions: {
        Row: {
          created_at: string
          id: string
          model_type: string
          performance_metrics: Json
          status: string
          training_data_count: number
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_type?: string
          performance_metrics?: Json
          status?: string
          training_data_count?: number
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          model_type?: string
          performance_metrics?: Json
          status?: string
          training_data_count?: number
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          accuracy_percentage: number | null
          average_split_time: number | null
          created_at: string
          directional_trend: string | null
          drill_mode: boolean | null
          group_size_mm: number | null
          id: string
          split_times: Json | null
          time_to_first_shot: number | null
          total_score: number | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          accuracy_percentage?: number | null
          average_split_time?: number | null
          created_at?: string
          directional_trend?: string | null
          drill_mode?: boolean | null
          group_size_mm?: number | null
          id?: string
          split_times?: Json | null
          time_to_first_shot?: number | null
          total_score?: number | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          accuracy_percentage?: number | null
          average_split_time?: number | null
          created_at?: string
          directional_trend?: string | null
          drill_mode?: boolean | null
          group_size_mm?: number | null
          id?: string
          split_times?: Json | null
          time_to_first_shot?: number | null
          total_score?: number | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      shots: {
        Row: {
          comment: string | null
          direction: string
          id: string
          score: number
          session_id: string
          shot_number: number
          shot_timestamp: number | null
          x_coordinate: number
          y_coordinate: number
        }
        Insert: {
          comment?: string | null
          direction: string
          id?: string
          score: number
          session_id: string
          shot_number: number
          shot_timestamp?: number | null
          x_coordinate: number
          y_coordinate: number
        }
        Update: {
          comment?: string | null
          direction?: string
          id?: string
          score?: number
          session_id?: string
          shot_number?: number
          shot_timestamp?: number | null
          x_coordinate?: number
          y_coordinate?: number
        }
        Relationships: [
          {
            foreignKeyName: "shots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_data: {
        Row: {
          annotations: Json
          created_at: string
          detections: Json
          id: string
          is_validated: boolean
          used_for_training: boolean
          video_id: string
        }
        Insert: {
          annotations?: Json
          created_at?: string
          detections?: Json
          id?: string
          is_validated?: boolean
          used_for_training?: boolean
          video_id: string
        }
        Update: {
          annotations?: Json
          created_at?: string
          detections?: Json
          id?: string
          is_validated?: boolean
          used_for_training?: boolean
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_data_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          duration: number
          filename: string
          hash: string
          id: string
          size: number
          storage_url: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          duration: number
          filename: string
          hash: string
          id?: string
          size: number
          storage_url: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          duration?: number
          filename?: string
          hash?: string
          id?: string
          size?: number
          storage_url?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
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
