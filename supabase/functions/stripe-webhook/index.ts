import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    
    // Use async version for Deno environment
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400 }
    );
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error("No user ID in session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  // Create or update subscription record
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: "active",
      price_usd: 29,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Error creating subscription:", error);
  } else {
    console.log(`Subscription created for user: ${userId}`);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  // Find user by stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, referral_code_used")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for customer:", customerId);
    return;
  }

  // Update subscription status to active
  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status: "active",
      renew_at: new Date(invoice.period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Subscription activated for user: ${profile.id}`);

  // Calculate affiliate commission (30% = $8.70 from $29)
  if (profile.referral_code_used) {
    await calculateAffiliateCommission(profile.id, profile.referral_code_used, 29);
  }
}

async function calculateAffiliateCommission(
  referredUserId: string, 
  referralCode: string, 
  amountPaid: number
) {
  // Find affiliate by code
  const { data: affiliateCode } = await supabaseAdmin
    .from("affiliate_codes")
    .select("user_id")
    .eq("code", referralCode.toUpperCase())
    .single();

  if (!affiliateCode) {
    console.log(`No affiliate found for code: ${referralCode}`);
    return;
  }

  const commissionRate = 0.30; // 30%
  const commissionAmount = amountPaid * commissionRate; // $8.70

  // Get current month for payout tracking
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Create payout record
  await supabaseAdmin
    .from("affiliate_payouts")
    .insert({
      affiliate_code: referralCode.toUpperCase(),
      user_id_referred: referredUserId,
      amount_paid: amountPaid,
      commission_affiliate: commissionAmount,
      month: currentMonth,
    });

  // Update affiliate earnings
  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("id, usd_earned, usd_available")
    .eq("user_id", affiliateCode.user_id)
    .single();

  if (affiliate) {
    await supabaseAdmin
      .from("affiliates")
      .update({
        usd_earned: (affiliate.usd_earned || 0) + commissionAmount,
        usd_available: (affiliate.usd_available || 0) + commissionAmount,
      })
      .eq("id", affiliate.id);

    console.log(`Commission $${commissionAmount} added to affiliate: ${affiliateCode.user_id}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("stripe_subscription_id", subscription.id);

  console.log(`Subscription cancelled: ${subscription.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const status = subscription.status === "active" ? "active" : 
                 subscription.status === "past_due" ? "past_due" : 
                 subscription.status === "canceled" ? "cancelled" : subscription.status;

  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status,
      renew_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  console.log(`Subscription updated: ${subscription.id} -> ${status}`);
}
