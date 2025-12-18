import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "pending_sparkcode"
  | "completed"
  | "cancelled";

export interface Submission {
  id: string;
  campaign_id: string;
  creator_id: string;
  video_url: string | null;
  video_file_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  proposed_price_mxn: number;
  creator_note: string | null;
  status: SubmissionStatus;
  brand_feedback: string | null;
  approved_price_mxn: number | null;
  spark_code: string | null;
  spark_code_submitted_at: string | null;
  legal_consent_accepted: boolean;
  legal_consent_accepted_at: string | null;
  rejected_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  campaigns?: {
    id: string;
    title: string;
    product_name: string;
    product_image_url: string | null;
    min_payment_mxn: number;
    max_payment_mxn: number;
    requires_spark_code: boolean;
    brand_profiles?: {
      company_name: string;
      logo_url: string | null;
    };
  };
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface CreateSubmissionInput {
  campaign_id: string;
  video_url?: string;
  video_file_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  proposed_price_mxn: number;
  creator_note?: string;
  legal_consent_accepted: boolean;
}

interface UseSubmissionsOptions {
  campaignId?: string;
  creatorId?: string;
  status?: SubmissionStatus;
  forBrand?: boolean; // If true, fetch submissions for brand's campaigns
}

export const useSubmissions = (options: UseSubmissionsOptions = {}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("campaign_submissions")
        .select(`
          *,
          campaigns (
            id,
            title,
            product_name,
            product_image_url,
            min_payment_mxn,
            max_payment_mxn,
            requires_spark_code,
            brand_profiles (
              company_name,
              logo_url
            )
          )
        `)
        .order("created_at", { ascending: false });

      // Filter by campaign
      if (options.campaignId) {
        query = query.eq("campaign_id", options.campaignId);
      }

      // Filter by creator
      if (options.creatorId) {
        query = query.eq("creator_id", options.creatorId);
      }

      // Filter by status
      if (options.status) {
        query = query.eq("status", options.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSubmissions((data || []) as Submission[]);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setError("Error al cargar envíos");
    } finally {
      setIsLoading(false);
    }
  }, [options.campaignId, options.creatorId, options.status]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const getSubmission = async (submissionId: string): Promise<Submission | null> => {
    try {
      const { data, error } = await supabase
        .from("campaign_submissions")
        .select(`
          *,
          campaigns (
            id,
            title,
            product_name,
            product_image_url,
            min_payment_mxn,
            max_payment_mxn,
            requires_spark_code,
            brand_profiles (
              company_name,
              logo_url
            )
          )
        `)
        .eq("id", submissionId)
        .single();

      if (error) throw error;
      return data as Submission;
    } catch (err) {
      console.error("Error fetching submission:", err);
      return null;
    }
  };

  const createSubmission = async (
    input: CreateSubmissionInput
  ): Promise<Submission | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para enviar un video");
        return null;
      }

      if (!input.legal_consent_accepted) {
        toast.error("Debes aceptar los términos legales");
        return null;
      }

      const { data, error } = await supabase
        .from("campaign_submissions")
        .insert({
          ...input,
          creator_id: user.id,
          legal_consent_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Ya has enviado un video a esta campaña");
        } else {
          throw error;
        }
        return null;
      }

      toast.success("Video enviado exitosamente");
      await fetchSubmissions();
      return data as Submission;
    } catch (err) {
      console.error("Error creating submission:", err);
      toast.error("Error al enviar el video");
      return null;
    }
  };

  const updateSubmission = async (
    submissionId: string,
    updates: Partial<Submission>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("campaign_submissions")
        .update(updates)
        .eq("id", submissionId);

      if (error) throw error;

      await fetchSubmissions();
      return true;
    } catch (err) {
      console.error("Error updating submission:", err);
      toast.error("Error al actualizar el envío");
      return false;
    }
  };

  // Creator actions
  const submitSparkCode = async (
    submissionId: string,
    sparkCode: string
  ): Promise<boolean> => {
    const success = await updateSubmission(submissionId, {
      spark_code: sparkCode,
      spark_code_submitted_at: new Date().toISOString(),
      status: "completed",
      completed_at: new Date().toISOString(),
    } as Partial<Submission>);

    if (success) {
      toast.success("SparkCode enviado exitosamente");
    }
    return success;
  };

  const cancelSubmission = async (submissionId: string): Promise<boolean> => {
    const success = await updateSubmission(submissionId, {
      status: "cancelled",
    } as Partial<Submission>);

    if (success) {
      toast.success("Envío cancelado");
    }
    return success;
  };

  // Brand actions
  const approveSubmission = async (
    submissionId: string,
    approvedPrice: number,
    feedback?: string
  ): Promise<boolean> => {
    const success = await updateSubmission(submissionId, {
      status: "pending_sparkcode",
      approved_price_mxn: approvedPrice,
      brand_feedback: feedback || null,
      approved_at: new Date().toISOString(),
    } as Partial<Submission>);

    if (success) {
      toast.success("Video aprobado");
    }
    return success;
  };

  const rejectSubmission = async (
    submissionId: string,
    feedback: string
  ): Promise<boolean> => {
    const success = await updateSubmission(submissionId, {
      status: "rejected",
      brand_feedback: feedback,
      rejected_at: new Date().toISOString(),
    } as Partial<Submission>);

    if (success) {
      toast.success("Video rechazado");
    }
    return success;
  };

  const requestChanges = async (
    submissionId: string,
    feedback: string
  ): Promise<boolean> => {
    const success = await updateSubmission(submissionId, {
      brand_feedback: feedback,
    } as Partial<Submission>);

    if (success) {
      toast.success("Feedback enviado al creador");
    }
    return success;
  };

  // Stats
  const getStats = () => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "pending_review").length,
      approved: submissions.filter((s) => s.status === "approved" || s.status === "pending_sparkcode").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
      completed: submissions.filter((s) => s.status === "completed").length,
    };
  };

  return {
    submissions,
    isLoading,
    error,
    refetch: fetchSubmissions,
    getSubmission,
    createSubmission,
    updateSubmission,
    // Creator actions
    submitSparkCode,
    cancelSubmission,
    // Brand actions
    approveSubmission,
    rejectSubmission,
    requestChanges,
    // Stats
    getStats,
  };
};

// Hook for fetching creator's own submissions
export const useMySubmissions = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  return useSubmissions({ creatorId: userId || undefined });
};
