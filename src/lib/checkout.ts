// Guests register before checkout; signed-in users use create-checkout.
// Referral attribution is forwarded through registration and validated on the server.

import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import { trackInitiateCheckout } from "@/lib/analytics";

import { MONTHLY_PRICE_USD } from "@/lib/pricing";
const PRICE_USD = MONTHLY_PRICE_USD;
const PLAN_LABEL = "TokXray Pro";

/**
 * Kick off Stripe Checkout in one click and redirect the browser to the
 * hosted Stripe page. Resolves (without redirecting) on error after showing
 * a toast, so callers can clear their loading state.
 */
export async function startCheckout(referralOverride?: string): Promise<void> {
  const referral_code = referralOverride === undefined ? getStoredRefCode() || undefined : referralOverride || undefined;


  try {
    const {
      data: { session }, error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) {
      window.location.href = `/register?redirect=%2Fpricing${referral_code ? `&ref=${encodeURIComponent(referral_code)}` : ""}`;
      return;
    }
    if (!session.user.email_confirmed_at) {
      window.location.href = "/auth/continue?redirect=%2Fpricing";
      return;
    }
    trackInitiateCheckout(PRICE_USD, "USD", PLAN_LABEL);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { referral_code },
    });

    if (error) {
      const detail = await error.context?.json?.().catch(() => null);
      throw new Error(detail?.error || "No pudimos abrir el pago. Intenta de nuevo.");
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error("No checkout URL returned");
  } catch (err) {
    console.error("startCheckout error:", err);
    toast.error(err instanceof Error ? err.message : "No pudimos abrir el pago. Intenta de nuevo.");
  }
}

/**
 * Button-friendly wrapper that exposes a `loading` flag so callers can
 * disable the CTA and avoid a double Stripe session on rapid clicks.
 */
export function useStartCheckout() {
  const [loading, setLoading] = useState(false);

  const inFlight = useRef(false);
  const startWithReferral = async (referralOverride?: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await startCheckout(referralOverride);
    } finally {
      // If the redirect fired, the page is already navigating away; clearing
      // loading here is harmless. On error we re-enable the button.
      inFlight.current = false;
      setLoading(false);
    }
  };

  return { start: () => startWithReferral(), startWithReferral, loading };
}
