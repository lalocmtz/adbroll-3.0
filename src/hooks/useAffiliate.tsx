import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Affiliate = Tables<"affiliates">;
export type Referral = Tables<"referrals">;

export const useAffiliate = () => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
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

      // Fetch affiliate data
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
    loading,
    refetch: fetchAffiliateData,
  };
};
