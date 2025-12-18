import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emailEvents } from "@/lib/transactionalEmail";

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  product_name: string;
  product_url: string | null;
  product_image_url: string | null;
  brief: string;
  rules: string | null;
  objective: string;
  min_payment_mxn: number;
  max_payment_mxn: number;
  requires_spark_code: boolean;
  video_duration_min: number;
  video_duration_max: number;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  max_submissions: number | null;
  submissions_count: number;
  approved_count: number;
  total_spent_mxn: number;
  created_at: string;
  updated_at: string;
  // Joined data
  brand_profiles?: {
    company_name: string;
    logo_url: string | null;
    verified: boolean;
  };
}

export interface CreateCampaignInput {
  title: string;
  product_name: string;
  product_url?: string;
  product_image_url?: string;
  brief: string;
  rules?: string;
  objective?: string;
  min_payment_mxn?: number;
  max_payment_mxn?: number;
  requires_spark_code?: boolean;
  video_duration_min?: number;
  video_duration_max?: number;
  starts_at?: string;
  ends_at?: string;
  max_submissions?: number;
}

interface UseCampaignsOptions {
  brandId?: string;
  status?: string;
  activeOnly?: boolean;
}

export const useCampaigns = (options: UseCampaignsOptions = {}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("campaigns")
        .select(`
          *,
          brand_profiles (
            company_name,
            logo_url,
            verified
          )
        `)
        .order("created_at", { ascending: false });

      // Filter by brand if specified
      if (options.brandId) {
        query = query.eq("brand_id", options.brandId);
      }

      // Filter by status
      if (options.status) {
        query = query.eq("status", options.status);
      } else if (options.activeOnly) {
        query = query.eq("status", "active");
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setCampaigns((data || []) as Campaign[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Error al cargar campañas");
    } finally {
      setIsLoading(false);
    }
  }, [options.brandId, options.status, options.activeOnly]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const getCampaign = async (campaignId: string): Promise<Campaign | null> => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brand_profiles (
            company_name,
            logo_url,
            verified
          )
        `)
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data as Campaign;
    } catch (err) {
      console.error("Error fetching campaign:", err);
      return null;
    }
  };

  const createCampaign = async (
    brandId: string,
    input: CreateCampaignInput
  ): Promise<Campaign | null> => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          brand_id: brandId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification (async, don't block)
      try {
        // Get brand profile email
        const { data: brandProfile } = await supabase
          .from("brand_profiles")
          .select("company_name, contact_email")
          .eq("id", brandId)
          .single();

        if (brandProfile?.contact_email) {
          const campaign = data as Campaign;
          emailEvents.campaignCreated(
            brandProfile.contact_email,
            brandProfile.company_name || "",
            campaign.title,
            `$${campaign.min_payment_mxn}`,
            `$${campaign.max_payment_mxn}`,
            `${window.location.origin}/brand/campaigns/${campaign.id}`
          );
        }
      } catch (emailErr) {
        console.error("Error sending campaign email:", emailErr);
      }

      toast.success("Campaña creada exitosamente");
      await fetchCampaigns();
      return data as Campaign;
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error("Error al crear la campaña");
      return null;
    }
  };

  const updateCampaign = async (
    campaignId: string,
    updates: Partial<CreateCampaignInput & { status: string }>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Campaña actualizada");
      await fetchCampaigns();
      return true;
    } catch (err) {
      console.error("Error updating campaign:", err);
      toast.error("Error al actualizar la campaña");
      return false;
    }
  };

  const deleteCampaign = async (campaignId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Campaña eliminada");
      await fetchCampaigns();
      return true;
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Error al eliminar la campaña");
      return false;
    }
  };

  const publishCampaign = async (campaignId: string): Promise<boolean> => {
    return updateCampaign(campaignId, { status: "active" });
  };

  const pauseCampaign = async (campaignId: string): Promise<boolean> => {
    return updateCampaign(campaignId, { status: "paused" });
  };

  const completeCampaign = async (campaignId: string): Promise<boolean> => {
    return updateCampaign(campaignId, { status: "completed" });
  };

  return {
    campaigns,
    isLoading,
    error,
    refetch: fetchCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    publishCampaign,
    pauseCampaign,
    completeCampaign,
  };
};
