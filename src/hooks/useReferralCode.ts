import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AffiliateCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}

export interface ReferralDiscount {
  id: string;
  user_id: string;
  plan_original_price: number;
  discounted_price: number;
  used_referral_code: string;
  discount_applied: boolean;
  created_at: string;
}

// Single plan: Adbroll Pro $29/month
export const PLANS = {
  free: { name: "Free", price: 0 },
  creator: { name: "Adbroll Pro", price: 29 },
  studio: { name: "Adbroll Pro", price: 29 },
} as const;

export type PlanType = keyof typeof PLANS;

export const useReferralCode = () => {
  const [affiliateCode, setAffiliateCode] = useState<AffiliateCode | null>(null);
  const [referralDiscount, setReferralDiscount] = useState<ReferralDiscount | null>(null);
  const [referralCodeUsed, setReferralCodeUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user's affiliate code
      const { data: codeData } = await supabase
        .from("affiliate_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (codeData) {
        setAffiliateCode(codeData);
      }

      // Fetch user's referral discount
      const { data: discountData } = await supabase
        .from("affiliate_discounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (discountData) {
        setReferralDiscount(discountData);
      }

      // Fetch referral code used from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("referral_code_used")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.referral_code_used) {
        setReferralCodeUsed(profileData.referral_code_used);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching referral data:", error);
      setLoading(false);
    }
  };

  const createAffiliateCode = async (): Promise<{ code: string | null; error: string | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { code: null, error: "No user logged in" };

      // Generate unique code
      const { data: generatedCode, error: genError } = await supabase
        .rpc("generate_affiliate_code");

      if (genError) return { code: null, error: genError.message };

      // Insert the code
      const { data, error } = await supabase
        .from("affiliate_codes")
        .insert({
          user_id: user.id,
          code: generatedCode,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { code: null, error: "Ya tienes un código de afiliado" };
        }
        return { code: null, error: error.message };
      }

      setAffiliateCode(data);
      return { code: data.code, error: null };
    } catch (error: any) {
      return { code: null, error: error.message };
    }
  };

  const validateReferralCode = async (code: string): Promise<boolean> => {
    const { data } = await supabase
      .from("affiliate_codes")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    return !!data;
  };

  const applyReferralCode = async (code: string): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "No user logged in" };

      // Check if user already has a referral code
      if (referralCodeUsed) {
        return { success: false, error: "Ya tienes un código de referido aplicado" };
      }

      // Validate code exists
      const isValid = await validateReferralCode(code);
      if (!isValid) {
        return { success: false, error: "Código inválido" };
      }

      // Apply the code using RPC function
      const { data, error } = await supabase.rpc("apply_referral_code", {
        p_user_id: user.id,
        p_code: code,
      });

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: "Código inválido" };

      setReferralCodeUsed(code.toUpperCase());
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const createDiscount = async (planType: PlanType): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "No user logged in" };

      if (!referralCodeUsed) {
        return { success: false, error: "No referral code applied" };
      }

      // Always use $29 for Adbroll Pro
      const originalPrice = 29;
      const discountedPrice = originalPrice * 0.5;

      const { data, error } = await supabase
        .from("affiliate_discounts")
        .insert({
          user_id: user.id,
          plan_original_price: originalPrice,
          discounted_price: discountedPrice,
          used_referral_code: referralCodeUsed,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "Ya tienes un descuento aplicado" };
        }
        return { success: false, error: error.message };
      }

      setReferralDiscount(data);
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const getPriceForPlan = (planType: PlanType) => {
    // Always return $29 for paid plans
    const originalPrice = planType === "free" ? 0 : 29;
    const hasDiscount = referralCodeUsed && !referralDiscount?.discount_applied && originalPrice > 0;
    const discountedPrice = hasDiscount ? originalPrice * 0.5 : originalPrice;

    return {
      originalPrice,
      discountedPrice,
      hasDiscount,
    };
  };

  return {
    affiliateCode,
    referralDiscount,
    referralCodeUsed,
    loading,
    createAffiliateCode,
    validateReferralCode,
    applyReferralCode,
    createDiscount,
    getPriceForPlan,
    refetch: fetchData,
  };
};
