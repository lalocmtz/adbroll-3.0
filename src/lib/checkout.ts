// One-click checkout helper.
//
// Sends any "unlock / start" CTA straight to Stripe Checkout — Stripe's own
// page collects the email + card for cold visitors, so we never need an
// intermediate email-capture screen. Logged-in users go through
// `create-checkout` (uses their auth + profile); guests go through
// `create-checkout-guest` (email optional).
//
// Affiliate attribution (ref_code) is always forwarded so commissions are
// preserved.

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import { trackInitiateCheckout, trackAddPaymentInfo } from "@/lib/analytics";

const PRICE_USD = 24.99;
const PLAN_LABEL = "TokXray Pro";

const readProspectEmail = (): string | undefined => {
  try {
    return localStorage.getItem("adbroll_prospect_email") || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Kick off Stripe Checkout in one click and redirect the browser to the
 * hosted Stripe page. Resolves (without redirecting) on error after showing
 * a toast, so callers can clear their loading state.
 */
export async function startCheckout(): Promise<void> {
  const referral_code = getStoredRefCode() || undefined;
  const prospectEmail = readProspectEmail();

  // Strong intent signals for Meta — fire both on the same click.
  trackInitiateCheckout(PRICE_USD, "USD", PLAN_LABEL);
  trackAddPaymentInfo(PRICE_USD, "USD", PLAN_LABEL);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = session
      ? await supabase.functions.invoke("create-checkout", {
          body: { referral_code },
        })
      : await supabase.functions.invoke("create-checkout-guest", {
          body: { email: prospectEmail || undefined, referral_code },
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
