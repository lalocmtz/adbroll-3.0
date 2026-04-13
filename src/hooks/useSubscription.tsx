import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Subscription = Tables<"subscriptions">;

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

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

      // TEMPORARY DEV BYPASS: Full access for development account
      if (user.email === "lalocmtz@gmail.com") {
        setSubscription(null);
        setHasActiveSubscription(true);
        setLoading(false);
        return;
      }

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
    refetch: checkSubscription,
  };
};
