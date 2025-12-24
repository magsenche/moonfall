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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      game_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          data: Json | null
          event_type: string
          game_id: string
          id: string
          target_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          data?: Json | null
          event_type: string
          game_id: string
          id?: string
          target_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          data?: Json | null
          event_type?: string
          game_id?: string
          id?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: string
          created_at: string | null
          current_phase: number | null
          ended_at: string | null
          id: string
          name: string
          phase_ends_at: string | null
          settings: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"] | null
          winner: Database["public"]["Enums"]["team_type"] | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_phase?: number | null
          ended_at?: string | null
          id?: string
          name: string
          phase_ends_at?: string | null
          settings?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          winner?: Database["public"]["Enums"]["team_type"] | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_phase?: number | null
          ended_at?: string | null
          id?: string
          name?: string
          phase_ends_at?: string | null
          settings?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          winner?: Database["public"]["Enums"]["team_type"] | null
        }
        Relationships: []
      }
      mission_assignments: {
        Row: {
          bid: number | null
          created_at: string | null
          id: string
          mission_id: string
          player_id: string
          score: number | null
          status: string | null
          submission_data: Json | null
          submitted_at: string | null
          validated_by_mj: boolean | null
        }
        Insert: {
          bid?: number | null
          created_at?: string | null
          id?: string
          mission_id: string
          player_id: string
          score?: number | null
          status?: string | null
          submission_data?: Json | null
          submitted_at?: string | null
          validated_by_mj?: boolean | null
        }
        Update: {
          bid?: number | null
          created_at?: string | null
          id?: string
          mission_id?: string
          player_id?: string
          score?: number | null
          status?: string | null
          submission_data?: Json | null
          submitted_at?: string | null
          validated_by_mj?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_assignments_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_templates: {
        Row: {
          category: Database["public"]["Enums"]["mission_category"]
          created_at: string | null
          creator_id: string | null
          description: string
          external_url: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          mission_type: Database["public"]["Enums"]["mission_type"]
          penalty_description: string | null
          reward_description: string | null
          reward_type: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed: boolean | null
          sort_order: number | null
          time_limit_seconds: number | null
          title: string
          updated_at: string | null
          validation_type: Database["public"]["Enums"]["mission_validation_type"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["mission_category"]
          created_at?: string | null
          creator_id?: string | null
          description: string
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          mission_type?: Database["public"]["Enums"]["mission_type"]
          penalty_description?: string | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed?: boolean | null
          sort_order?: number | null
          time_limit_seconds?: number | null
          title: string
          updated_at?: string | null
          validation_type?: Database["public"]["Enums"]["mission_validation_type"]
        }
        Update: {
          category?: Database["public"]["Enums"]["mission_category"]
          created_at?: string | null
          creator_id?: string | null
          description?: string
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          mission_type?: Database["public"]["Enums"]["mission_type"]
          penalty_description?: string | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed?: boolean | null
          sort_order?: number | null
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string | null
          validation_type?: Database["public"]["Enums"]["mission_validation_type"]
        }
        Relationships: []
      }
      missions: {
        Row: {
          assigned_to: string | null
          auction_data: Json | null
          category: Database["public"]["Enums"]["mission_category"] | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          description: string
          external_url: string | null
          game_id: string
          id: string
          is_template: boolean | null
          mission_type: Database["public"]["Enums"]["mission_type"] | null
          penalty_description: string | null
          result_data: Json | null
          reward_data: Json | null
          reward_description: string | null
          reward_type: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed: boolean | null
          started_at: string | null
          status: Database["public"]["Enums"]["mission_status"] | null
          template_id: string | null
          time_limit_seconds: number | null
          title: string
          type: string
          validated_at: string | null
          validated_by: string | null
          validation_type:
            | Database["public"]["Enums"]["mission_validation_type"]
            | null
          winner_player_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          auction_data?: Json | null
          category?: Database["public"]["Enums"]["mission_category"] | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description: string
          external_url?: string | null
          game_id: string
          id?: string
          is_template?: boolean | null
          mission_type?: Database["public"]["Enums"]["mission_type"] | null
          penalty_description?: string | null
          result_data?: Json | null
          reward_data?: Json | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed?: boolean | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          template_id?: string | null
          time_limit_seconds?: number | null
          title: string
          type: string
          validated_at?: string | null
          validated_by?: string | null
          validation_type?:
            | Database["public"]["Enums"]["mission_validation_type"]
            | null
          winner_player_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          auction_data?: Json | null
          category?: Database["public"]["Enums"]["mission_category"] | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string
          external_url?: string | null
          game_id?: string
          id?: string
          is_template?: boolean | null
          mission_type?: Database["public"]["Enums"]["mission_type"] | null
          penalty_description?: string | null
          result_data?: Json | null
          reward_data?: Json | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          sabotage_allowed?: boolean | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"] | null
          template_id?: string | null
          time_limit_seconds?: number | null
          title?: string
          type?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_type?:
            | Database["public"]["Enums"]["mission_validation_type"]
            | null
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          color: string | null
          created_at: string | null
          death_at: string | null
          death_reason: string | null
          game_id: string
          id: string
          is_alive: boolean | null
          is_mj: boolean | null
          pseudo: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string | null
          death_at?: string | null
          death_reason?: string | null
          game_id: string
          id?: string
          is_alive?: boolean | null
          is_mj?: boolean | null
          pseudo: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string | null
          death_at?: string | null
          death_reason?: string | null
          game_id?: string
          id?: string
          is_alive?: boolean | null
          is_mj?: boolean | null
          pseudo?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      power_uses: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          phase: number
          player_id: string
          power_id: string
          result: Json | null
          target_id: string | null
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          phase: number
          player_id: string
          power_id: string
          result?: Json | null
          target_id?: string | null
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          phase?: number
          player_id?: string
          power_id?: string
          result?: Json | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "power_uses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_uses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_uses_power_id_fkey"
            columns: ["power_id"]
            isOneToOne: false
            referencedRelation: "powers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_uses_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      powers: {
        Row: {
          created_at: string | null
          description: string
          id: string
          name: string
          phase: Database["public"]["Enums"]["power_phase"]
          priority: number
          role_id: string
          uses_per_game: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          name: string
          phase: Database["public"]["Enums"]["power_phase"]
          priority?: number
          role_id: string
          uses_per_game?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          name?: string
          phase?: Database["public"]["Enums"]["power_phase"]
          priority?: number
          role_id?: string
          uses_per_game?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "powers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          player_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          player_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          player_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          card_image_url: string | null
          created_at: string | null
          description: string
          display_name: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          team: Database["public"]["Enums"]["team_type"]
        }
        Insert: {
          card_image_url?: string | null
          created_at?: string | null
          description: string
          display_name: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          team: Database["public"]["Enums"]["team_type"]
        }
        Update: {
          card_image_url?: string | null
          created_at?: string | null
          description?: string
          display_name?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          team?: Database["public"]["Enums"]["team_type"]
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          phase: number
          target_id: string | null
          vote_type: Database["public"]["Enums"]["vote_type"]
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          phase: number
          target_id?: string | null
          vote_type: Database["public"]["Enums"]["vote_type"]
          voter_id: string
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          phase?: number
          target_id?: string | null
          vote_type?: Database["public"]["Enums"]["vote_type"]
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      wolf_chat: {
        Row: {
          created_at: string | null
          game_id: string
          id: string
          message: string
          player_id: string
        }
        Insert: {
          created_at?: string | null
          game_id: string
          id?: string
          message: string
          player_id: string
        }
        Update: {
          created_at?: string | null
          game_id?: string
          id?: string
          message?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wolf_chat_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wolf_chat_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_status: "lobby" | "jour" | "nuit" | "conseil" | "terminee"
      mission_category:
        | "social"
        | "challenge"
        | "quiz"
        | "external"
        | "photo"
        | "auction"
      mission_status:
        | "pending"
        | "in_progress"
        | "success"
        | "failed"
        | "cancelled"
      mission_type: "individual" | "collective" | "competitive" | "auction"
      mission_validation_type:
        | "mj"
        | "auto"
        | "upload"
        | "external"
        | "first_wins"
        | "best_score"
      power_phase: "nuit" | "jour" | "mort"
      reward_type:
        | "wolf_hint"
        | "immunity"
        | "double_vote"
        | "extra_vision"
        | "silence"
        | "none"
      team_type: "village" | "loups" | "solo"
      vote_type: "jour" | "nuit_loup" | "pouvoir"
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
    Enums: {
      game_status: ["lobby", "jour", "nuit", "conseil", "terminee"],
      mission_category: [
        "social",
        "challenge",
        "quiz",
        "external",
        "photo",
        "auction",
      ],
      mission_status: [
        "pending",
        "in_progress",
        "success",
        "failed",
        "cancelled",
      ],
      mission_type: ["individual", "collective", "competitive", "auction"],
      mission_validation_type: [
        "mj",
        "auto",
        "upload",
        "external",
        "first_wins",
        "best_score",
      ],
      power_phase: ["nuit", "jour", "mort"],
      reward_type: [
        "wolf_hint",
        "immunity",
        "double_vote",
        "extra_vision",
        "silence",
        "none",
      ],
      team_type: ["village", "loups", "solo"],
      vote_type: ["jour", "nuit_loup", "pouvoir"],
    },
  },
} as const
