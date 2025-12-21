import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Subscription = Tables<"subscriptions">;

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [isGrantedAccess, setIsGrantedAccess] = useState(false);
  const [grantExpiresAt, setGrantExpiresAt] = useState<string | null>(null);

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

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isFounder,
    isGrantedAccess,
    grantExpiresAt,
    refetch: checkSubscription,
  };
};
