// Guests register before checkout; signed-in users use create-checkout.
// Referral attribution is forwarded through registration and validated on the server.

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import { trackInitiateCheckout, trackAddPaymentInfo } from "@/lib/analytics";

const PRICE_USD = 30.00;
const PLAN_LABEL = "TokXray Pro";

/**
 * Kick off Stripe Checkout in one click and redirect the browser to the
 * hosted Stripe page. Resolves (without redirecting) on error after showing
 * a toast, so callers can clear their loading state.
 */
export async function startCheckout(): Promise<void> {
  const referral_code = getStoredRefCode() || undefined;

  // Strong intent signals for Meta — fire both on the same click.
  trackInitiateCheckout(PRICE_USD, "USD", PLAN_LABEL);
  trackAddPaymentInfo(PRICE_USD, "USD", PLAN_LABEL);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = `/register?redirect=%2Fpricing${referral_code ? `&ref=${encodeURIComponent(referral_code)}` : ""}`;
      return;
    }
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { referral_code },
    });

    if (error) throw error;

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error("No checkout URL returned");
  } catch (err) {
    console.error("startCheckout error:", err);
    toast.error("No pudimos abrir el pago. Intenta de nuevo.");
  }
}

/**
 * Button-friendly wrapper that exposes a `loading` flag so callers can
 * disable the CTA and avoid a double Stripe session on rapid clicks.
 */
export function useStartCheckout() {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await startCheckout();
    } finally {
      // If the redirect fired, the page is already navigating away; clearing
      // loading here is harmless. On error we re-enable the button.
      setLoading(false);
    }
  };

  return { start, loading };
}
