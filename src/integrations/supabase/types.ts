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
      players: {
        Row: {
          age: number | null
          created_at: string
          id: string
          name: string
          nationality: string | null
          photo_url: string | null
          position: string | null
          rating: number | null
          season_year: number | null
          shirt_number: number | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          id?: string
          name: string
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          rating?: number | null
          season_year?: number | null
          shirt_number?: number | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          id?: string
          name?: string
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          rating?: number | null
          season_year?: number | null
          shirt_number?: number | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      published_tournaments: {
        Row: {
          created_at: string | null
          id: string | null
          share_token: string | null
          tournament_id: string | null
          user_id: string | null
          visibility: string
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          share_token?: string | null
          tournament_id?: string | null
          user_id?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string | null
          id?: string | null
          share_token?: string | null
          tournament_id?: string | null
          user_id?: string | null
          visibility?: string
        }
        Relationships: []
      }
      team_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_histories: {
        Row: {
          abbreviation: string | null
          colors: string | null
          created_at: string | null
          end_year: number
          field_type: string
          id: string
          logo: string | null
          name: string | null
          rating: number | null
          short_name: string | null
          start_year: number
          team_id: string
          user_id: string
        }
        Insert: {
          abbreviation?: string | null
          colors?: string | null
          created_at?: string | null
          end_year: number
          field_type?: string
          id?: string
          logo?: string | null
          name?: string | null
          rating?: number | null
          short_name?: string | null
          start_year: number
          team_id: string
          user_id: string
        }
        Update: {
          abbreviation?: string | null
          colors?: string | null
          created_at?: string | null
          end_year?: number
          field_type?: string
          id?: string
          logo?: string | null
          name?: string | null
          rating?: number | null
          short_name?: string | null
          start_year?: number
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          abbreviation: string | null
          colors: string | null
          created_at: string | null
          folder_id: string | null
          founding_year: string | null
          id: string | null
          is_archived: boolean
          logo: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          primaryColor: string | null
          rate: number | null
          secondary_color: string | null
          secondaryColor: string | null
          short_name: string | null
          user_id: string | null
        }
        Insert: {
          abbreviation?: string | null
          colors?: string | null
          created_at?: string | null
          folder_id?: string | null
          founding_year?: string | null
          id?: string | null
          is_archived?: boolean
          logo?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          primaryColor?: string | null
          rate?: number | null
          secondary_color?: string | null
          secondaryColor?: string | null
          short_name?: string | null
          user_id?: string | null
        }
        Update: {
          abbreviation?: string | null
          colors?: string | null
          created_at?: string | null
          folder_id?: string | null
          founding_year?: string | null
          id?: string | null
          is_archived?: boolean
          logo?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          primaryColor?: string | null
          rate?: number | null
          secondary_color?: string | null
          secondaryColor?: string | null
          short_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tournament_collaborators: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          published_tournament_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          published_tournament_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          published_tournament_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tournament_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string | null
          finalized: string | null
          folder_id: string | null
          format: string | null
          groups_finalized: string | null
          grupos_mata_mata_inicio: string | null
          grupos_quantidade: string | null
          grupos_turnos: string | null
          id: string | null
          liga_turnos: string | null
          logo: string | null
          logo_url: string | null
          mata_mata_inicio: string | null
          matches: Json | null
          name: string | null
          number_of_teams: string | null
          preliminary_phases: Json | null
          seasons: Json | null
          settings: string | null
          sport: string | null
          suico_jogos_liga: string | null
          suico_mata_mata_inicio: string | null
          suico_playoff_vagas: string | null
          team_ids: Json | null
          user_id: string | null
          year: string | null
        }
        Insert: {
          created_at?: string | null
          finalized?: string | null
          folder_id?: string | null
          format?: string | null
          groups_finalized?: string | null
          grupos_mata_mata_inicio?: string | null
          grupos_quantidade?: string | null
          grupos_turnos?: string | null
          id?: string | null
          liga_turnos?: string | null
          logo?: string | null
          logo_url?: string | null
          mata_mata_inicio?: string | null
          matches?: Json | null
          name?: string | null
          number_of_teams?: string | null
          preliminary_phases?: Json | null
          seasons?: Json | null
          settings?: string | null
          sport?: string | null
          suico_jogos_liga?: string | null
          suico_mata_mata_inicio?: string | null
          suico_playoff_vagas?: string | null
          team_ids?: Json | null
          user_id?: string | null
          year?: string | null
        }
        Update: {
          created_at?: string | null
          finalized?: string | null
          folder_id?: string | null
          format?: string | null
          groups_finalized?: string | null
          grupos_mata_mata_inicio?: string | null
          grupos_quantidade?: string | null
          grupos_turnos?: string | null
          id?: string | null
          liga_turnos?: string | null
          logo?: string | null
          logo_url?: string | null
          mata_mata_inicio?: string | null
          matches?: Json | null
          name?: string | null
          number_of_teams?: string | null
          preliminary_phases?: Json | null
          seasons?: Json | null
          settings?: string | null
          sport?: string | null
          suico_jogos_liga?: string | null
          suico_mata_mata_inicio?: string | null
          suico_playoff_vagas?: string | null
          team_ids?: Json | null
          user_id?: string | null
          year?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_logo_ownership: { Args: { object_name: string }; Returns: boolean }
      get_collaborator_role: {
        Args: { p_token: string; p_user_email: string }
        Returns: string
      }
      get_shared_tournament_full: { Args: { p_token: string }; Returns: Json }
      get_tournament_by_share_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string | null
          finalized: string | null
          folder_id: string | null
          format: string | null
          groups_finalized: string | null
          grupos_mata_mata_inicio: string | null
          grupos_quantidade: string | null
          grupos_turnos: string | null
          id: string | null
          liga_turnos: string | null
          logo: string | null
          logo_url: string | null
          mata_mata_inicio: string | null
          matches: Json | null
          name: string | null
          number_of_teams: string | null
          preliminary_phases: Json | null
          seasons: Json | null
          settings: string | null
          sport: string | null
          suico_jogos_liga: string | null
          suico_mata_mata_inicio: string | null
          suico_playoff_vagas: string | null
          team_ids: Json | null
          user_id: string | null
          year: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_shared_tournament: {
        Args: { p_token: string; p_updates: Json; p_user_email: string }
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
