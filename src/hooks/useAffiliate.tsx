import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Affiliate = Tables<"affiliates">;
export type Referral = Tables<"referrals">;

// Shape returned by the get_affiliate_dashboard() RPC (real, server-computed data).
export interface AffiliateDashboard {
  code: string;
  code_customized: boolean;
  link_ready: boolean;
  connect_ready: boolean;
  has_connect: boolean;
  usd_earned: number;
  usd_available: number;
  usd_withdrawn: number;
  active_referrals: number;
  referrals: Array<{
    email_masked: string;
    status: string;
    since: string | null;
    monthly_commission: number;
  }>;
  payouts_history: Array<{ amount: number; status: string; date: string }>;
  commissions_history: Array<{
    amount: number;
    type: string;
    month: string;
    status: string;
    date: string;
  }>;
  error?: string;
}

export const useAffiliate = () => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffiliateData();
  }, []);

  const fetchAffiliateData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Primary source of truth: server RPC with real, computed data.
      const { data: dashData, error: dashError } = await supabase.rpc("get_affiliate_dashboard");
      if (!dashError && dashData && !(dashData as any).error) {
        setDashboard(dashData as unknown as AffiliateDashboard);
      } else if (dashError) {
        console.error("Error fetching affiliate dashboard:", dashError);
      }

      // Fetch affiliate row (used for Stripe Connect gating + ids).
      const { data: affiliateData, error: affiliateError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (affiliateError && affiliateError.code !== "PGRST116") {
        console.error("Error fetching affiliate:", affiliateError);
        setLoading(false);
        return;
      }

      setAffiliate(affiliateData);

      // Fetch referrals if affiliate exists
      if (affiliateData) {
        const { data: referralsData, error: referralsError } = await supabase
          .from("referrals")
          .select("*")
          .eq("affiliate_id", affiliateData.id)
          .order("created_at", { ascending: false });

        if (referralsError) {
          console.error("Error fetching referrals:", referralsError);
        } else {
          setReferrals(referralsData || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      setLoading(false);
    }
  };

  return {
    affiliate,
    referrals,
    dashboard,
    loading,
    refetch: fetchAffiliateData,
  };
};
