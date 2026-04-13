import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MINIMUM_PAYOUT = 50; // $50 USD minimum

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      .gte("usd_available", MINIMUM_PAYOUT);

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
        const payoutAmount = affiliate.usd_available;
        const amountInCents = Math.round(payoutAmount * 100);

        console.log(`Processing payout of $${payoutAmount} to account ${affiliate.stripe_connect_id}`);

        // Create transfer to Connect account
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: "usd",
          destination: affiliate.stripe_connect_id!,
          metadata: {
            affiliate_id: affiliate.id,
            user_id: affiliate.user_id,
          },
        });

        console.log(`Transfer created: ${transfer.id}`);

        // Record withdrawal in history
        await supabaseAdmin
          .from("withdrawal_history")
          .insert({
            affiliate_id: affiliate.id,
            amount: payoutAmount,
            stripe_transfer_id: transfer.id,
            status: "completed",
          });

        // Update affiliate balance
        await supabaseAdmin
          .from("affiliates")
          .update({
            usd_available: 0,
            usd_withdrawn: (affiliate.usd_withdrawn || 0) + payoutAmount,
            last_payout_at: new Date().toISOString(),
          })
          .eq("id", affiliate.id);

        results.processed++;
        results.total_amount += payoutAmount;

      } catch (transferError: unknown) {
        const errorMessage = transferError instanceof Error ? transferError.message : "Unknown error";
        console.error(`Failed to process payout for affiliate ${affiliate.id}:`, transferError);
        results.failed++;
        results.errors.push(`Affiliate ${affiliate.id}: ${errorMessage}`);

        // Record failed withdrawal attempt
        await supabaseAdmin
          .from("withdrawal_history")
          .insert({
            affiliate_id: affiliate.id,
            amount: affiliate.usd_available,
            status: "failed",
          });
      }
    }

    console.log("Payout processing complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
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
