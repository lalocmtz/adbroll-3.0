import { canRetryPayout } from "../_shared/billing.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Disabled until payout reconciliation, retries and the Stripe account are verified.
  const expected = Deno.env.get("PAYOUTS_CRON_SECRET");
  if (!expected || req.headers.get("Authorization") !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (Deno.env.get("AFFILIATE_PAYOUTS_ENABLED") !== "true") {
    return new Response(JSON.stringify({ error: "Payouts are not enabled" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    console.log("Starting weekly payout processing...");

    // Find all affiliates eligible for payout:
    // - Has Stripe Connect account
    // - Onboarding complete
    // - Available balance >= $50
    const { data: eligibleAffiliates, error: fetchError } = await supabaseAdmin
      .from("affiliates")
      .select("id, user_id, stripe_connect_id, usd_available, usd_withdrawn")
      .eq("stripe_onboarding_complete", true)
      .not("stripe_connect_id", "is", null)
      .eq("payouts_enabled", true)
      .eq("payout_hold", false)
      .limit(1000);

    if (fetchError) {
      throw new Error(`Error fetching affiliates: ${fetchError.message}`);
    }

    console.log(`Found ${eligibleAffiliates?.length || 0} affiliates eligible for payout`);

    const results = {
      processed: 0,
      failed: 0,
      total_amount: 0,
      errors: [] as string[],
    };

    for (const affiliate of eligibleAffiliates || []) {
      try {
        const { data: reservation, error: reserveError } = await supabaseAdmin.rpc("reserve_affiliate_payout", { p_affiliate_id: affiliate.id });
        if (reserveError) throw reserveError;
        if (!reservation) continue;
        // Never silently start a new transfer after Stripe's idempotency window.
        if (!canRetryPayout(reservation.created_at)) throw new Error(`Reconcile pending withdrawal ${reservation.id} before retrying`);
        const payoutAmount = Number(reservation.amount);
        const transfer = await stripe.transfers.create({
          amount: Math.round(payoutAmount * 100), currency: "usd",
          destination: reservation.destination,
          metadata: { affiliate_id: affiliate.id, withdrawal_id: reservation.id },
        }, { idempotencyKey: `tokxray-withdrawal-${reservation.id}` });
        const { data: finalized, error: completeError } = await supabaseAdmin.rpc("complete_affiliate_payout", {
          p_withdrawal_id: reservation.id, p_transfer_id: transfer.id,
        });
        if (completeError) throw completeError;
        if (!finalized) continue;

        results.processed++;
        results.total_amount += payoutAmount;

      } catch (transferError: unknown) {
        const errorMessage = transferError instanceof Error ? transferError.message : "Unknown error";
        console.error(`Failed to process payout for affiliate ${affiliate.id}:`, transferError);
        results.failed++;
        results.errors.push(`Affiliate ${affiliate.id}: ${errorMessage}`);

        // Keep the reservation for reconciliation: a network error can happen
        // after Stripe moved the money. Releasing it here could pay twice.

      }
    }

    console.log("Payout processing complete:", results);

    return new Response(
      JSON.stringify({
        success: results.failed === 0,
        ...results,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: results.failed > 0 ? 500 : 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing payouts:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
