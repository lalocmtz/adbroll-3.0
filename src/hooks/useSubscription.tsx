import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Subscription = Tables<"subscriptions">;
export type PlanTier = "free" | "pro" | "premium";

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [isGrantedAccess, setIsGrantedAccess] = useState(false);
  const [grantExpiresAt, setGrantExpiresAt] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier>("free");

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Get plan tier from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.plan_tier) {
        setPlanTier(profileData.plan_tier as PlanTier);
      }

      // Check for founder role using server-side RLS protected table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (roleData) {
        setIsFounder(true);
        setHasActiveSubscription(true);
        setPlanTier("premium"); // Founders get premium access
        setLoading(false);
        return;
      }

      // Check for active creator program grant
      const { data: grantData } = await supabase
        .from("creator_program_applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("subscription_ends_at", new Date().toISOString())
        .maybeSingle();

      if (grantData) {
        setIsGrantedAccess(true);
        setGrantExpiresAt(grantData.subscription_ends_at);
        setHasActiveSubscription(true);
        setPlanTier("premium"); // Granted access gets premium
        setLoading(false);
        return;
      }

      // Check regular subscription
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching subscription:", error);
        setLoading(false);
        return;
      }

      setSubscription(data);
      setHasActiveSubscription(data?.status === "active");
      setLoading(false);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setLoading(false);
    }
  };

  // Derived states
  const isPro = planTier === "pro" || planTier === "premium";
  const isPremium = planTier === "premium";
  const canGenerateVideos = isPremium || isFounder || isGrantedAccess;

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isFounder,
    isGrantedAccess,
    grantExpiresAt,
    planTier,
    isPro,
    isPremium,
    canGenerateVideos,
    refetch: checkSubscription,
  };
};
