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
      affiliates: {
        Row: {
          active_referrals_count: number
          created_at: string | null
          id: string
          ref_code: string
          usd_available: number
          usd_earned: number
          usd_withdrawn: number
          user_id: string
        }
        Insert: {
          active_referrals_count?: number
          created_at?: string | null
          id?: string
          ref_code: string
          usd_available?: number
          usd_earned?: number
          usd_withdrawn?: number
          user_id: string
        }
        Update: {
          active_referrals_count?: number
          created_at?: string | null
          id?: string
          ref_code?: string
          usd_available?: number
          usd_earned?: number
          usd_withdrawn?: number
          user_id?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          creator_handle: string | null
          gmv_live_mxn: number | null
          id: string
          last_import: string | null
          last_imported_from_kalodata_at: string | null
          likes_30d: number | null
          mejor_video_url: string | null
          nombre_completo: string | null
          promedio_roas: number | null
          promedio_visualizaciones: number | null
          revenue_live: number | null
          revenue_videos: number | null
          sales_30d: number | null
          seguidores: number | null
          tiktok_url: string | null
          total_ingresos_mxn: number | null
          total_live_count: number | null
          total_ventas: number | null
          total_videos: number | null
          updated_at: string | null
          usuario_creador: string
          views_30d: number | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          creator_handle?: string | null
          gmv_live_mxn?: number | null
          id?: string
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          likes_30d?: number | null
          mejor_video_url?: string | null
          nombre_completo?: string | null
          promedio_roas?: number | null
          promedio_visualizaciones?: number | null
          revenue_live?: number | null
          revenue_videos?: number | null
          sales_30d?: number | null
          seguidores?: number | null
          tiktok_url?: string | null
          total_ingresos_mxn?: number | null
          total_live_count?: number | null
          total_ventas?: number | null
          total_videos?: number | null
          updated_at?: string | null
          usuario_creador: string
          views_30d?: number | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          creator_handle?: string | null
          gmv_live_mxn?: number | null
          id?: string
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          likes_30d?: number | null
          mejor_video_url?: string | null
          nombre_completo?: string | null
          promedio_roas?: number | null
          promedio_visualizaciones?: number | null
          revenue_live?: number | null
          revenue_videos?: number | null
          sales_30d?: number | null
          seguidores?: number | null
          tiktok_url?: string | null
          total_ingresos_mxn?: number | null
          total_live_count?: number | null
          total_ventas?: number | null
          total_videos?: number | null
          updated_at?: string | null
          usuario_creador?: string
          views_30d?: number | null
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
          featured_today: boolean | null
          fecha_publicacion: string
          generated_at: string | null
          gpm_mxn: number | null
          guion_ia: string | null
          id: string
          ingresos_mxn: number
          product_id: string | null
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
          featured_today?: boolean | null
          fecha_publicacion: string
          generated_at?: string | null
          gpm_mxn?: number | null
          guion_ia?: string | null
          id?: string
          ingresos_mxn: number
          product_id?: string | null
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
          featured_today?: boolean | null
          fecha_publicacion?: string
          generated_at?: string | null
          gpm_mxn?: number | null
          guion_ia?: string | null
          id?: string
          ingresos_mxn?: number
          product_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "daily_feed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_feed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      favorites_products: {
        Row: {
          created_at: string | null
          id: string
          product_data: Json
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_data: Json
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_data?: Json
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites_scripts: {
        Row: {
          created_at: string | null
          id: string
          script_data: Json
          script_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          script_data: Json
          script_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          script_data?: Json
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_scripts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "guiones_personalizados"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites_videos: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_data: Json
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_data: Json
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_data?: Json
          video_url?: string
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
      imports: {
        Row: {
          created_at: string | null
          creators_imported: number | null
          file_name: string | null
          id: string
          products_imported: number | null
          total_rows: number | null
          videos_imported: number | null
        }
        Insert: {
          created_at?: string | null
          creators_imported?: number | null
          file_name?: string | null
          id?: string
          products_imported?: number | null
          total_rows?: number | null
          videos_imported?: number | null
        }
        Update: {
          created_at?: string | null
          creators_imported?: number | null
          file_name?: string | null
          id?: string
          products_imported?: number | null
          total_rows?: number | null
          videos_imported?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          categoria: string | null
          commission: number | null
          commission_amount: number | null
          created_at: string | null
          creators_active_30d: number | null
          creators_count: number | null
          currency: string | null
          descripcion: string | null
          gmv_30d_mxn: number | null
          gmv_7d_mxn: number | null
          id: string
          imagen_url: string | null
          is_hidden: boolean | null
          is_opportunity: boolean | null
          last_import: string | null
          last_imported_from_kalodata_at: string | null
          precio_mxn: number | null
          price: number | null
          producto_nombre: string
          producto_url: string | null
          promedio_roas: number | null
          rank: number | null
          rating: number | null
          revenue_30d: number | null
          revenue_7d: number | null
          sales_7d: number | null
          tiktok_product_id: string | null
          total_ingresos_mxn: number | null
          total_ventas: number | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          commission?: number | null
          commission_amount?: number | null
          created_at?: string | null
          creators_active_30d?: number | null
          creators_count?: number | null
          currency?: string | null
          descripcion?: string | null
          gmv_30d_mxn?: number | null
          gmv_7d_mxn?: number | null
          id?: string
          imagen_url?: string | null
          is_hidden?: boolean | null
          is_opportunity?: boolean | null
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          precio_mxn?: number | null
          price?: number | null
          producto_nombre: string
          producto_url?: string | null
          promedio_roas?: number | null
          rank?: number | null
          rating?: number | null
          revenue_30d?: number | null
          revenue_7d?: number | null
          sales_7d?: number | null
          tiktok_product_id?: string | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          commission?: number | null
          commission_amount?: number | null
          created_at?: string | null
          creators_active_30d?: number | null
          creators_count?: number | null
          currency?: string | null
          descripcion?: string | null
          gmv_30d_mxn?: number | null
          gmv_7d_mxn?: number | null
          id?: string
          imagen_url?: string | null
          is_hidden?: boolean | null
          is_opportunity?: boolean | null
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          precio_mxn?: number | null
          price?: number | null
          producto_nombre?: string
          producto_url?: string | null
          promedio_roas?: number | null
          rank?: number | null
          rating?: number | null
          revenue_30d?: number | null
          revenue_7d?: number | null
          sales_7d?: number | null
          tiktok_product_id?: string | null
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
      referrals: {
        Row: {
          affiliate_id: string
          created_at: string | null
          date: string | null
          earned_usd: number
          id: string
          referred_user_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          date?: string | null
          earned_usd?: number
          id?: string
          referred_user_id: string
          status: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          date?: string | null
          earned_usd?: number
          id?: string
          referred_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          price_usd: number
          renew_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_usd?: number
          renew_at?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_usd?: number
          renew_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transcription_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error: string | null
          id: string
          status: string | null
          transcription_text: string | null
          updated_at: string | null
          video_id: string
          video_url: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          id?: string
          status?: string | null
          transcription_text?: string | null
          updated_at?: string | null
          video_id: string
          video_url: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          id?: string
          status?: string | null
          transcription_text?: string | null
          updated_at?: string | null
          video_id?: string
          video_url?: string
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
      videos: {
        Row: {
          ai_match_attempted_at: string | null
          ai_match_confidence: number | null
          analysis_json: Json | null
          category: string | null
          country: string | null
          creator_handle: string | null
          creator_id: string | null
          creator_name: string | null
          duration: number | null
          id: string
          imported_at: string | null
          processing_status: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          product_revenue: number | null
          product_sales: number | null
          rank: number | null
          revenue_mxn: number | null
          roas: number | null
          sales: number | null
          snapshot_at: string | null
          snapshot_date_range: string | null
          thumbnail_url: string | null
          title: string | null
          transcript: string | null
          variants_json: Json | null
          video_mp4_url: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          ai_match_attempted_at?: string | null
          ai_match_confidence?: number | null
          analysis_json?: Json | null
          category?: string | null
          country?: string | null
          creator_handle?: string | null
          creator_id?: string | null
          creator_name?: string | null
          duration?: number | null
          id?: string
          imported_at?: string | null
          processing_status?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_revenue?: number | null
          product_sales?: number | null
          rank?: number | null
          revenue_mxn?: number | null
          roas?: number | null
          sales?: number | null
          snapshot_at?: string | null
          snapshot_date_range?: string | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          variants_json?: Json | null
          video_mp4_url?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          ai_match_attempted_at?: string | null
          ai_match_confidence?: number | null
          analysis_json?: Json | null
          category?: string | null
          country?: string | null
          creator_handle?: string | null
          creator_id?: string | null
          creator_name?: string | null
          duration?: number | null
          id?: string
          imported_at?: string | null
          processing_status?: string | null
          product_id?: string | null
          product_name?: string | null
          product_price?: number | null
          product_revenue?: number | null
          product_sales?: number | null
          rank?: number | null
          revenue_mxn?: number | null
          roas?: number | null
          sales?: number | null
          snapshot_at?: string | null
          snapshot_date_range?: string | null
          thumbnail_url?: string | null
          title?: string | null
          transcript?: string | null
          variants_json?: Json | null
          video_mp4_url?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_opportunities: {
        Row: {
          categoria: string | null
          commission: number | null
          commission_amount: number | null
          commission_percent_calc: number | null
          created_at: string | null
          creators_active_30d: number | null
          creators_active_calc: number | null
          creators_count: number | null
          currency: string | null
          descripcion: string | null
          gmv_30d_calc: number | null
          gmv_30d_mxn: number | null
          gmv_7d_mxn: number | null
          id: string | null
          imagen_url: string | null
          is_hidden: boolean | null
          is_hidden_gem: boolean | null
          is_opportunity: boolean | null
          last_import: string | null
          last_imported_from_kalodata_at: string | null
          opportunity_index: number | null
          precio_mxn: number | null
          price: number | null
          producto_nombre: string | null
          producto_url: string | null
          promedio_roas: number | null
          rank: number | null
          rating: number | null
          revenue_30d: number | null
          revenue_7d: number | null
          sales_7d: number | null
          tiktok_product_id: string | null
          total_ingresos_mxn: number | null
          total_ventas: number | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          commission?: number | null
          commission_amount?: number | null
          commission_percent_calc?: never
          created_at?: string | null
          creators_active_30d?: number | null
          creators_active_calc?: never
          creators_count?: number | null
          currency?: string | null
          descripcion?: string | null
          gmv_30d_calc?: never
          gmv_30d_mxn?: number | null
          gmv_7d_mxn?: number | null
          id?: string | null
          imagen_url?: string | null
          is_hidden?: boolean | null
          is_hidden_gem?: never
          is_opportunity?: boolean | null
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          opportunity_index?: never
          precio_mxn?: number | null
          price?: number | null
          producto_nombre?: string | null
          producto_url?: string | null
          promedio_roas?: number | null
          rank?: number | null
          rating?: number | null
          revenue_30d?: number | null
          revenue_7d?: number | null
          sales_7d?: number | null
          tiktok_product_id?: string | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          commission?: number | null
          commission_amount?: number | null
          commission_percent_calc?: never
          created_at?: string | null
          creators_active_30d?: number | null
          creators_active_calc?: never
          creators_count?: number | null
          currency?: string | null
          descripcion?: string | null
          gmv_30d_calc?: never
          gmv_30d_mxn?: number | null
          gmv_7d_mxn?: number | null
          id?: string | null
          imagen_url?: string | null
          is_hidden?: boolean | null
          is_hidden_gem?: never
          is_opportunity?: boolean | null
          last_import?: string | null
          last_imported_from_kalodata_at?: string | null
          opportunity_index?: never
          precio_mxn?: number | null
          price?: number | null
          producto_nombre?: string | null
          producto_url?: string | null
          promedio_roas?: number | null
          rank?: number | null
          rating?: number | null
          revenue_30d?: number | null
          revenue_7d?: number | null
          sales_7d?: number | null
          tiktok_product_id?: string | null
          total_ingresos_mxn?: number | null
          total_ventas?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_ref_code: { Args: never; Returns: string }
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
