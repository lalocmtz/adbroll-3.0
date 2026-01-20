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
      affiliate_agencies: {
        Row: {
          agency_code: string
          agency_owner_user_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          agency_code: string
          agency_owner_user_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          agency_code?: string
          agency_owner_user_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      affiliate_agency_assignments: {
        Row: {
          affiliate_code: string
          agency_code: string
          created_at: string | null
          id: string
        }
        Insert: {
          affiliate_code: string
          agency_code: string
          created_at?: string | null
          id?: string
        }
        Update: {
          affiliate_code?: string
          agency_code?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      affiliate_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_discounts: {
        Row: {
          created_at: string | null
          discount_applied: boolean | null
          discounted_price: number
          id: string
          plan_original_price: number
          used_referral_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_applied?: boolean | null
          discounted_price: number
          id?: string
          plan_original_price: number
          used_referral_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_applied?: boolean | null
          discounted_price?: number
          id?: string
          plan_original_price?: number
          used_referral_code?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_code: string
          amount_paid: number
          commission_affiliate: number
          commission_agency: number | null
          created_at: string | null
          id: string
          month: string
          user_id_referred: string
        }
        Insert: {
          affiliate_code: string
          amount_paid?: number
          commission_affiliate?: number
          commission_agency?: number | null
          created_at?: string | null
          id?: string
          month: string
          user_id_referred: string
        }
        Update: {
          affiliate_code?: string
          amount_paid?: number
          commission_affiliate?: number
          commission_agency?: number | null
          created_at?: string | null
          id?: string
          month?: string
          user_id_referred?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          code_used: string
          created_at: string | null
          id: string
          referred_user_id: string
        }
        Insert: {
          code_used: string
          created_at?: string | null
          id?: string
          referred_user_id: string
        }
        Update: {
          code_used?: string
          created_at?: string | null
          id?: string
          referred_user_id?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          active_referrals_count: number
          created_at: string | null
          id: string
          last_payout_at: string | null
          ref_code: string
          stripe_connect_id: string | null
          stripe_onboarding_complete: boolean | null
          usd_available: number
          usd_earned: number
          usd_withdrawn: number
          user_id: string
        }
        Insert: {
          active_referrals_count?: number
          created_at?: string | null
          id?: string
          last_payout_at?: string | null
          ref_code: string
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          usd_available?: number
          usd_earned?: number
          usd_withdrawn?: number
          user_id: string
        }
        Update: {
          active_referrals_count?: number
          created_at?: string | null
          id?: string
          last_payout_at?: string | null
          ref_code?: string
          stripe_connect_id?: string | null
          stripe_onboarding_complete?: boolean | null
          usd_available?: number
          usd_earned?: number
          usd_withdrawn?: number
          user_id?: string
        }
        Relationships: []
      }
      brand_profiles: {
        Row: {
          company_name: string
          contact_email: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      campaign_applications: {
        Row: {
          admin_notes: string | null
          campaign_id: string
          created_at: string | null
          creator_directory_id: string
          id: string
          note: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          campaign_id: string
          created_at?: string | null
          creator_directory_id: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          campaign_id?: string
          created_at?: string | null
          creator_directory_id?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_applications_creator_directory_id_fkey"
            columns: ["creator_directory_id"]
            isOneToOne: false
            referencedRelation: "creator_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_submissions: {
        Row: {
          approved_at: string | null
          approved_price_mxn: number | null
          brand_feedback: string | null
          campaign_id: string
          completed_at: string | null
          created_at: string | null
          creator_id: string
          creator_note: string | null
          duration_seconds: number | null
          id: string
          legal_consent_accepted: boolean | null
          legal_consent_accepted_at: string | null
          proposed_price_mxn: number
          rejected_at: string | null
          spark_code: string | null
          spark_code_submitted_at: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string | null
          video_file_url: string | null
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_price_mxn?: number | null
          brand_feedback?: string | null
          campaign_id: string
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          creator_note?: string | null
          duration_seconds?: number | null
          id?: string
          legal_consent_accepted?: boolean | null
          legal_consent_accepted_at?: string | null
          proposed_price_mxn: number
          rejected_at?: string | null
          spark_code?: string | null
          spark_code_submitted_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_file_url?: string | null
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_price_mxn?: number | null
          brand_feedback?: string | null
          campaign_id?: string
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          creator_note?: string | null
          duration_seconds?: number | null
          id?: string
          legal_consent_accepted?: boolean | null
          legal_consent_accepted_at?: string | null
          proposed_price_mxn?: number
          rejected_at?: string | null
          spark_code?: string | null
          spark_code_submitted_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          video_file_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_transactions: {
        Row: {
          amount_mxn: number
          brand_id: string
          created_at: string | null
          creator_id: string
          id: string
          paid_at: string | null
          platform_fee_mxn: number | null
          status: string
          stripe_payment_intent_id: string | null
          submission_id: string
        }
        Insert: {
          amount_mxn: number
          brand_id: string
          created_at?: string | null
          creator_id: string
          id?: string
          paid_at?: string | null
          platform_fee_mxn?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          submission_id: string
        }
        Update: {
          amount_mxn?: number
          brand_id?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          paid_at?: string | null
          platform_fee_mxn?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_transactions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_transactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "campaign_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_count: number | null
          brand_id: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brief: string
          created_at: string | null
          ends_at: string | null
          id: string
          max_payment_mxn: number
          max_submissions: number | null
          min_payment_mxn: number
          objective: string
          product_image_url: string | null
          product_name: string
          product_url: string | null
          requires_spark_code: boolean | null
          rules: string | null
          starts_at: string | null
          status: string
          submissions_count: number | null
          title: string
          total_spent_mxn: number | null
          updated_at: string | null
          video_duration_max: number | null
          video_duration_min: number | null
        }
        Insert: {
          approved_count?: number | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brief: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          max_payment_mxn?: number
          max_submissions?: number | null
          min_payment_mxn?: number
          objective?: string
          product_image_url?: string | null
          product_name: string
          product_url?: string | null
          requires_spark_code?: boolean | null
          rules?: string | null
          starts_at?: string | null
          status?: string
          submissions_count?: number | null
          title: string
          total_spent_mxn?: number | null
          updated_at?: string | null
          video_duration_max?: number | null
          video_duration_min?: number | null
        }
        Update: {
          approved_count?: number | null
          brand_id?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brief?: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          max_payment_mxn?: number
          max_submissions?: number | null
          min_payment_mxn?: number
          objective?: string
          product_image_url?: string | null
          product_name?: string
          product_url?: string | null
          requires_spark_code?: boolean | null
          rules?: string | null
          starts_at?: string | null
          status?: string
          submissions_count?: number | null
          title?: string
          total_spent_mxn?: number | null
          updated_at?: string | null
          video_duration_max?: number | null
          video_duration_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_directory: {
        Row: {
          avatar_url: string | null
          content_type: string[]
          country: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          niche: string[]
          status: string
          terms_accepted: boolean
          terms_accepted_at: string | null
          tiktok_url: string | null
          tiktok_username: string
          updated_at: string | null
          verified: boolean | null
          whatsapp: string
        }
        Insert: {
          avatar_url?: string | null
          content_type?: string[]
          country?: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          niche?: string[]
          status?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          tiktok_url?: string | null
          tiktok_username: string
          updated_at?: string | null
          verified?: boolean | null
          whatsapp: string
        }
        Update: {
          avatar_url?: string | null
          content_type?: string[]
          country?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          niche?: string[]
          status?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          tiktok_url?: string | null
          tiktok_username?: string
          updated_at?: string | null
          verified?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      creator_program_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          grant_code: string | null
          granted_days: number | null
          id: string
          notes: string | null
          status: string
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          tiktok_url: string
          updated_at: string
          user_id: string | null
          video_url: string | null
          whatsapp: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          grant_code?: string | null
          granted_days?: number | null
          id?: string
          notes?: string | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          tiktok_url: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          grant_code?: string | null
          granted_days?: number | null
          id?: string
          notes?: string | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          tiktok_url?: string
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      creators: {
        Row: {
          avatar_storage_url: string | null
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
          avatar_storage_url?: string | null
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
          avatar_storage_url?: string | null
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
      credit_purchases: {
        Row: {
          amount_usd: number
          created_at: string | null
          credits_purchased: number
          id: string
          pack_type: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          credits_purchased: number
          id?: string
          pack_type: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          credits_purchased?: number
          id?: string
          pack_type?: string
          stripe_session_id?: string | null
          user_id?: string
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
      email_captures: {
        Row: {
          converted_at: string | null
          created_at: string | null
          email: string
          followup_sent_at: string | null
          id: string
          referral_code: string | null
          source: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          email: string
          followup_sent_at?: string | null
          id?: string
          referral_code?: string | null
          source?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          email?: string
          followup_sent_at?: string | null
          id?: string
          referral_code?: string | null
          source?: string | null
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
        Relationships: []
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
      generated_videos: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          kie_task_id: string | null
          product_image_url: string | null
          prompt_used: string | null
          source_video_id: string | null
          status: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          kie_task_id?: string | null
          product_image_url?: string | null
          prompt_used?: string | null
          source_video_id?: string | null
          status?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          kie_task_id?: string | null
          product_image_url?: string | null
          prompt_used?: string | null
          source_video_id?: string | null
          status?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_videos_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
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
      library_files: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          file_size: number | null
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          last_used_at: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          folder_id?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      library_folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      library_project_files: {
        Row: {
          file_id: string
          id: string
          position: number | null
          project_id: string
        }
        Insert: {
          file_id: string
          id?: string
          position?: number | null
          project_id: string
        }
        Update: {
          file_id?: string
          id?: string
          position?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_project_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "library_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "library_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_projects: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string | null
          id: string
          page_path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page_path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          market: string
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
          market?: string
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
          market?: string
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
          currency: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string | null
          marketplace: string | null
          plan: Database["public"]["Enums"]["user_plan"] | null
          plan_tier: string | null
          referral_code_used: string | null
          reminder_email_sent_at: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          marketplace?: string | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          plan_tier?: string | null
          referral_code_used?: string | null
          reminder_email_sent_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          marketplace?: string | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          plan_tier?: string | null
          referral_code_used?: string | null
          reminder_email_sent_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          welcome_email_sent_at?: string | null
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
          renewal_reminder_sent_at: string | null
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
          renewal_reminder_sent_at?: string | null
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
          renewal_reminder_sent_at?: string | null
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
      ugc_generations: {
        Row: {
          audio_url: string | null
          avatar_type: string
          completed_at: string | null
          cost_usd: number | null
          created_at: string
          current_step: number | null
          error_message: string | null
          id: string
          image_1_url: string | null
          image_2_url: string | null
          product_description: string
          product_image_url: string
          prompt_scene_1: string | null
          prompt_scene_2: string | null
          script: string | null
          status: string
          user_id: string
          video_1_task_id: string | null
          video_1_url: string | null
          video_2_task_id: string | null
          video_2_url: string | null
        }
        Insert: {
          audio_url?: string | null
          avatar_type?: string
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          id?: string
          image_1_url?: string | null
          image_2_url?: string | null
          product_description: string
          product_image_url: string
          prompt_scene_1?: string | null
          prompt_scene_2?: string | null
          script?: string | null
          status?: string
          user_id: string
          video_1_task_id?: string | null
          video_1_url?: string | null
          video_2_task_id?: string | null
          video_2_url?: string | null
        }
        Update: {
          audio_url?: string | null
          avatar_type?: string
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          current_step?: number | null
          error_message?: string | null
          id?: string
          image_1_url?: string | null
          image_2_url?: string | null
          product_description?: string
          product_image_url?: string
          prompt_scene_1?: string | null
          prompt_scene_2?: string | null
          script?: string | null
          status?: string
          user_id?: string
          video_1_task_id?: string | null
          video_1_url?: string | null
          video_2_task_id?: string | null
          video_2_url?: string | null
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
      video_credits: {
        Row: {
          created_at: string | null
          credits_monthly: number | null
          credits_purchased: number | null
          credits_total: number | null
          credits_used: number | null
          id: string
          last_monthly_reset: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_monthly?: number | null
          credits_purchased?: number | null
          credits_total?: number | null
          credits_used?: number | null
          id?: string
          last_monthly_reset?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_monthly?: number | null
          credits_purchased?: number | null
          credits_total?: number | null
          credits_used?: number | null
          id?: string
          last_monthly_reset?: string | null
          updated_at?: string | null
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
          download_attempts: number | null
          duration: number | null
          id: string
          imported_at: string | null
          manual_match: boolean | null
          manual_matched_at: string | null
          manual_matched_by: string | null
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
          visual_analyzed_at: string | null
          visual_confidence: number | null
          visual_keywords: string[] | null
          visual_product_detected: string | null
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
          download_attempts?: number | null
          duration?: number | null
          id?: string
          imported_at?: string | null
          manual_match?: boolean | null
          manual_matched_at?: string | null
          manual_matched_by?: string | null
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
          visual_analyzed_at?: string | null
          visual_confidence?: number | null
          visual_keywords?: string[] | null
          visual_product_detected?: string | null
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
          download_attempts?: number | null
          duration?: number | null
          id?: string
          imported_at?: string | null
          manual_match?: boolean | null
          manual_matched_at?: string | null
          manual_matched_by?: string | null
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
          visual_analyzed_at?: string | null
          visual_confidence?: number | null
          visual_keywords?: string[] | null
          visual_product_detected?: string | null
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
      withdrawal_history: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_history_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
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
          commission_percentile: number | null
          created_at: string | null
          creators_active_30d: number | null
          creators_active_calc: number | null
          creators_count: number | null
          creators_niche_avg: number | null
          currency: string | null
          descripcion: string | null
          earning_per_sale: number | null
          gmv_30d_calc: number | null
          gmv_30d_mxn: number | null
          gmv_7d_mxn: number | null
          gmv30d_percentile: number | null
          id: string | null
          imagen_url: string | null
          io_score: number | null
          is_hidden: boolean | null
          is_hidden_gem: boolean | null
          is_opportunity: boolean | null
          last_import: string | null
          last_imported_from_kalodata_at: string | null
          market: string | null
          opportunity_index: number | null
          opportunity_reason: Json | null
          precio_mxn: number | null
          price: number | null
          producto_nombre: string | null
          producto_url: string | null
          profit_niche_avg: number | null
          profit_percentile: number | null
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
        Relationships: []
      }
    }
    Functions: {
      apply_referral_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_grant_code: { Args: never; Returns: string }
      generate_ref_code: { Args: never; Returns: string }
      get_creator_directory_id: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_brand: { Args: { _user_id: string }; Returns: boolean }
      is_creator_in_directory: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "user" | "founder" | "brand"
      user_plan: "free" | "creator" | "studio"
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
      app_role: ["user", "founder", "brand"],
      user_plan: ["free", "creator", "studio"],
    },
  },
} as const
