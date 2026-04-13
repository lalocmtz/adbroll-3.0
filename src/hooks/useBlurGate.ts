import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export type AccessLevel = "visitor" | "free" | "paid";

export interface BlurGateState {
  accessLevel: AccessLevel;
  isLoggedIn: boolean;
  hasPaid: boolean;
  isFounder: boolean;
  loading: boolean;
  session: Session | null;
  shouldBlur: boolean;
  shouldBlurPartial: boolean;
}

export const useBlurGate = (): BlurGateState => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPaid, setHasPaid] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(() => checkSubscription(session.user.id), 0);
        } else {
          setHasPaid(false);
          setIsFounder(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkSubscription(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscription = async (userId: string) => {
    try {
      // Check for founder role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "founder")
        .maybeSingle();

      if (roleData) {
        setIsFounder(true);
        setHasPaid(true);
        setLoading(false);
        return;
      }

      // Check subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      setHasPaid(!!subData);
      setLoading(false);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setLoading(false);
    }
  };

  const isLoggedIn = !!session;
  
  let accessLevel: AccessLevel = "visitor";
  if (isLoggedIn && hasPaid) accessLevel = "paid";
  else if (isLoggedIn) accessLevel = "free";

  return {
    accessLevel,
    isLoggedIn,
    hasPaid,
    isFounder,
    loading,
    session,
    shouldBlur: accessLevel === "visitor",
    shouldBlurPartial: accessLevel === "free",
  };
};