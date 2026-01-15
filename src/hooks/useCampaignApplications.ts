import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Campaign } from "./useCampaigns";

export interface CampaignApplication {
  id: string;
  campaign_id: string;
  creator_directory_id: string;
  status: string;
  note: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  creator_directory?: {
    id: string;
    full_name: string;
    tiktok_username: string;
    avatar_url: string | null;
    email: string;
    whatsapp: string;
    niche: string[];
    content_type: string[];
    tiktok_url: string | null;
  };
  campaigns?: Campaign;
}

interface CreatorDirectoryEntry {
  id: string;
  email: string;
}

export const useCampaignApplications = (campaignId?: string) => {
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userCreatorId, setUserCreatorId] = useState<string | null>(null);
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<string[]>([]);

  // Check if current user is in creator_directory
  const checkCreatorStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { data, error } = await supabase
        .from("creator_directory")
        .select("id, email")
        .eq("email", user.email)
        .maybeSingle();

      if (!error && data) {
        setUserCreatorId((data as CreatorDirectoryEntry).id);
      }
    } catch (err) {
      console.error("Error checking creator status:", err);
    }
  }, []);

  // Fetch applications for a specific campaign (admin view)
  const fetchApplications = useCallback(async () => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("campaign_applications")
        .select(`
          *,
          creator_directory (
            id,
            full_name,
            tiktok_username,
            avatar_url,
            email,
            whatsapp,
            niche,
            content_type,
            tiktok_url
          )
        `)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications((data || []) as CampaignApplication[]);
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  // Fetch all campaign IDs user has applied to
  const fetchUserApplications = useCallback(async () => {
    if (!userCreatorId) return;

    try {
      const { data, error } = await supabase
        .from("campaign_applications")
        .select("campaign_id")
        .eq("creator_directory_id", userCreatorId);

      if (error) throw error;
      setAppliedCampaignIds((data || []).map(app => app.campaign_id));
    } catch (err) {
      console.error("Error fetching user applications:", err);
    }
  }, [userCreatorId]);

  useEffect(() => {
    checkCreatorStatus();
  }, [checkCreatorStatus]);

  useEffect(() => {
    if (campaignId) {
      fetchApplications();
    }
  }, [campaignId, fetchApplications]);

  useEffect(() => {
    if (userCreatorId) {
      fetchUserApplications();
    }
  }, [userCreatorId, fetchUserApplications]);

  // Apply to a campaign
  const applyToCampaign = async (
    targetCampaignId: string,
    note?: string
  ): Promise<boolean> => {
    if (!userCreatorId) {
      toast.error("Debes registrarte como creador primero");
      return false;
    }

    try {
      const { error } = await supabase
        .from("campaign_applications")
        .insert({
          campaign_id: targetCampaignId,
          creator_directory_id: userCreatorId,
          note: note || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya has aplicado a esta campaña");
        } else {
          throw error;
        }
        return false;
      }

      toast.success("¡Has aplicado a esta campaña!");
      setAppliedCampaignIds(prev => [...prev, targetCampaignId]);
      return true;
    } catch (err) {
      console.error("Error applying to campaign:", err);
      toast.error("Error al aplicar a la campaña");
      return false;
    }
  };

  // Update application status (admin)
  const updateApplicationStatus = async (
    applicationId: string,
    status: string,
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      const updates: Record<string, string> = { status };
      if (adminNotes !== undefined) {
        updates.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from("campaign_applications")
        .update(updates)
        .eq("id", applicationId);

      if (error) throw error;

      toast.success("Estado actualizado");
      await fetchApplications();
      return true;
    } catch (err) {
      console.error("Error updating application:", err);
      toast.error("Error al actualizar");
      return false;
    }
  };

  // Check if user has applied to a specific campaign
  const hasApplied = (targetCampaignId: string): boolean => {
    return appliedCampaignIds.includes(targetCampaignId);
  };

  return {
    applications,
    isLoading,
    userCreatorId,
    appliedCampaignIds,
    hasApplied,
    applyToCampaign,
    updateApplicationStatus,
    refetch: fetchApplications,
    refetchUserApplications: fetchUserApplications,
  };
};
