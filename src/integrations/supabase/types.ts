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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      creators: {
        Row: {
          created_at: string | null
          id: string
          mejor_video_url: string | null
          nombre_completo: string | null
          promedio_roas: number | null
          promedio_visualizaciones: number | null
          seguidores: number | null
          total_ingresos_mxn: number | null
          total_ventas: number | null
          total_videos: number | null
          updated_at: string | null
          usuario_creador: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mejor_video_url?: string | null
          nombre_completo?: string | null
          promedio_roas?: number | null
          promedio_visualizaciones?: number | null
          seguidores?: number | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          total_videos?: number | null
          updated_at?: string | null
          usuario_creador: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mejor_video_url?: string | null
          nombre_completo?: string | null
          promedio_roas?: number | null
          promedio_visualizaciones?: number | null
          seguidores?: number | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          total_videos?: number | null
          updated_at?: string | null
          usuario_creador?: string
        }
        Relationships: []
      }
      daily_feed: {
        Row: {
          ai_variants: Json | null
          coste_publicitario_mxn: number
          cpa_mxn: number
          creador: string
          created_at: string | null
          descripcion_video: string
          duracion: string
          fecha_publicacion: string
          generated_at: string | null
          gpm_mxn: number | null
          guion_ia: string | null
          id: string
          ingresos_mxn: number
          producto_nombre: string | null
          producto_url: string | null
          rango_fechas: string
          ratio_ads: number | null
          roas: number
          tiktok_url: string
          transcripcion_original: string | null
          ventas: number
          visualizaciones: number
        }
        Insert: {
          ai_variants?: Json | null
          coste_publicitario_mxn: number
          cpa_mxn: number
          creador: string
          created_at?: string | null
          descripcion_video: string
          duracion: string
          fecha_publicacion: string
          generated_at?: string | null
          gpm_mxn?: number | null
          guion_ia?: string | null
          id?: string
          ingresos_mxn: number
          producto_nombre?: string | null
          producto_url?: string | null
          rango_fechas: string
          ratio_ads?: number | null
          roas: number
          tiktok_url: string
          transcripcion_original?: string | null
          ventas: number
          visualizaciones: number
        }
        Update: {
          ai_variants?: Json | null
          coste_publicitario_mxn?: number
          cpa_mxn?: number
          creador?: string
          created_at?: string | null
          descripcion_video?: string
          duracion?: string
          fecha_publicacion?: string
          generated_at?: string | null
          gpm_mxn?: number | null
          guion_ia?: string | null
          id?: string
          ingresos_mxn?: number
          producto_nombre?: string | null
          producto_url?: string | null
          rango_fechas?: string
          ratio_ads?: number | null
          roas?: number
          tiktok_url?: string
          transcripcion_original?: string | null
          ventas?: number
          visualizaciones?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      guiones_personalizados: {
        Row: {
          contenido: string
          created_at: string | null
          id: string
          user_id: string
          version_number: number
          video_id: string
        }
        Insert: {
          contenido: string
          created_at?: string | null
          id?: string
          user_id: string
          version_number?: number
          video_id: string
        }
        Update: {
          contenido?: string
          created_at?: string | null
          id?: string
          user_id?: string
          version_number?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guiones_personalizados_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "daily_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          id: string
          imagen_url: string | null
          precio_mxn: number | null
          producto_nombre: string
          producto_url: string | null
          promedio_roas: number | null
          total_ingresos_mxn: number | null
          total_ventas: number | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          precio_mxn?: number | null
          producto_nombre: string
          producto_url?: string | null
          promedio_roas?: number | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          precio_mxn?: number | null
          producto_nombre?: string
          producto_url?: string | null
          promedio_roas?: number | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "founder"
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
      app_role: ["user", "founder"],
    },
  },
} as const
