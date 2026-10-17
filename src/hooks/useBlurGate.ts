import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { hasCreatorAccess } from "@/lib/creator-access";

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
    let active = true;
    let version = 0;

    const applySession = (nextSession: Session | null, defer = false) => {
      const requestVersion = ++version;
      setSession(nextSession);
      setHasPaid(false);
      setIsFounder(false);
      setLoading(!!nextSession?.user);
      if (!nextSession?.user) return;

      const checkAccess = async () => {
        try {
          const userId = nextSession.user.id;
          const [role, subscription, grant] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "founder").maybeSingle(),
            supabase.from("subscriptions").select("status, renew_at").eq("user_id", userId).maybeSingle(),
            supabase.from("creator_program_applications").select("status, access_kind, approved_at, subscription_ends_at").eq("user_id", userId).maybeSingle(),
          ]);
          if (!active || requestVersion !== version) return;
          const founder = !role.error && !!role.data;
          const sub = subscription.error ? null : subscription.data;
          const subscribed = !!sub && ["active", "trialing"].includes(sub.status)
            && (!sub.renew_at || Date.parse(sub.renew_at) > Date.now());
          // Same entitlement rules used by useSubscription and is_paid_user.
          const granted = !grant.error && hasCreatorAccess(grant.data);
          setIsFounder(founder);
          setHasPaid(founder || subscribed || granted);
        } catch {
          // Access checks fail closed; the backend remains authoritative.
        } finally {
          if (active && requestVersion === version) setLoading(false);
        }
      };
      // Supabase auth callbacks must not await another Supabase call.
      if (defer) setTimeout(() => { if (active && requestVersion === version) void checkAccess(); }, 0);
      else void checkAccess();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => { if (active) applySession(session, true); }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Do not overwrite a newer login/logout with the initial session lookup.
      if (active && version === 0) applySession(session);
    }).catch(() => {
      if (active && version === 0) setLoading(false);
    });

    return () => { active = false; version++; subscription.unsubscribe(); };
  }, []);

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
