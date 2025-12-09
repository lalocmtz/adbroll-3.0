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

// Helper to send emails via our send-email edge function
async function sendEmail(to: string, template: string, templateData: Record<string, string> = {}) {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, template, templateData }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to send email to ${to}:`, error);
    } else {
      console.log(`Email sent to ${to}: ${template}`);
    }
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    
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
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
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
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  const guestEmail = session.metadata?.guest_email;
  const createAccountOnSuccess = session.metadata?.create_account_on_success === "true";
  const referralCode = session.metadata?.referral_code;
  
  let userId = session.metadata?.supabase_user_id;
  let isNewAccount = false;

  // If guest checkout, create user account
  if (createAccountOnSuccess && guestEmail && !userId) {
    console.log(`Creating account for guest: ${guestEmail}`);
    
    const tempPassword = crypto.randomUUID();
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: guestEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { source: "paid_checkout" },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === guestEmail);
      if (existingUser) {
        userId = existingUser.id;
        console.log(`User already exists: ${userId}`);
      }
    } else if (authData.user) {
      userId = authData.user.id;
      isNewAccount = true;
      console.log(`User created: ${userId}`);

      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: guestEmail,
        stripe_customer_id: customerId,
        referral_code_used: referralCode || null,
      }, { onConflict: "id" });

      // Send account setup email instead of generic password reset
      await sendEmail(guestEmail, "account_setup", {
        email: guestEmail,
        setupLink: "https://adbroll.com/checkout/success",
      });
    }
  }

  if (!userId) {
    console.error("No user ID found for checkout session");
    return;
  }

  // Update profile with stripe customer ID
  await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId)
    .is("stripe_customer_id", null);

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
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Error creating subscription:", error);
  } else {
    console.log(`Subscription created for user: ${userId}`);
    
    // Send subscription confirmation email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    
    if (profile?.email && !isNewAccount) {
      await sendEmail(profile.email, "subscription_confirmed", { price: "29" });
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, referral_code_used")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for customer:", customerId);
    return;
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status: "active",
      renew_at: new Date(invoice.period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Subscription activated for user: ${profile.id}`);

  // Only send confirmation for renewal payments (not first payment which is handled in checkout)
  const isRenewal = invoice.billing_reason === "subscription_cycle";
  if (isRenewal && profile.email) {
    await sendEmail(profile.email, "subscription_confirmed", { price: "29" });
  }

  // Calculate affiliate commission
  if (profile.referral_code_used) {
    await calculateAffiliateCommission(profile.id, profile.referral_code_used, 29, profile.email);
  }
}

async function calculateAffiliateCommission(
  referredUserId: string, 
  referralCode: string, 
  amountPaid: number,
  referredEmail?: string
) {
  const { data: affiliateCode } = await supabaseAdmin
    .from("affiliate_codes")
    .select("user_id")
    .eq("code", referralCode.toUpperCase())
    .single();

  if (!affiliateCode) {
    console.log(`No affiliate found for code: ${referralCode}`);
    return;
  }

  const commissionRate = 0.30;
  const commissionAmount = amountPaid * commissionRate;
  const currentMonth = new Date().toISOString().slice(0, 7);

  await supabaseAdmin
    .from("affiliate_payouts")
    .insert({
      affiliate_code: referralCode.toUpperCase(),
      user_id_referred: referredUserId,
      amount_paid: amountPaid,
      commission_affiliate: commissionAmount,
      month: currentMonth,
    });

  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("id, user_id, usd_earned, usd_available, active_referrals_count")
    .eq("user_id", affiliateCode.user_id)
    .single();

  if (affiliate) {
    await supabaseAdmin
      .from("affiliates")
      .update({
        usd_earned: (affiliate.usd_earned || 0) + commissionAmount,
        usd_available: (affiliate.usd_available || 0) + commissionAmount,
        active_referrals_count: (affiliate.active_referrals_count || 0) + 1,
      })
      .eq("id", affiliate.id);

    console.log(`Commission $${commissionAmount} added to affiliate: ${affiliateCode.user_id}`);

    // Send commission notification email to affiliate
    const { data: affiliateProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", affiliateCode.user_id)
      .single();

    if (affiliateProfile?.email) {
      await sendEmail(affiliateProfile.email, "affiliate_commission", {
        amount: commissionAmount.toFixed(2),
        referredEmail: referredEmail || "usuario",
      });
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Payment failed for subscription: ${subscriptionId}`);

  // Send payment failed email
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile?.email) {
    await sendEmail(profile.email, "payment_failed", {});
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("stripe_subscription_id", subscription.id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, referral_code_used")
    .eq("stripe_customer_id", customerId)
    .single();

  // Send cancellation email
  if (profile?.email) {
    await sendEmail(profile.email, "subscription_cancelled", {});
  }

  // Decrement active referrals count for the affiliate
  if (profile?.referral_code_used) {
    const { data: affiliateCode } = await supabaseAdmin
      .from("affiliate_codes")
      .select("user_id")
      .eq("code", profile.referral_code_used.toUpperCase())
      .single();

    if (affiliateCode) {
      const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, active_referrals_count")
        .eq("user_id", affiliateCode.user_id)
        .single();

      if (affiliate && affiliate.active_referrals_count > 0) {
        await supabaseAdmin
          .from("affiliates")
          .update({ active_referrals_count: affiliate.active_referrals_count - 1 })
          .eq("id", affiliate.id);

        console.log(`Decremented active referrals for affiliate: ${affiliateCode.user_id}`);
      }
    }
  }

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

async function handleAccountUpdated(account: Stripe.Account) {
  const connectAccountId = account.id;
  
  if (account.type !== "express") {
    return;
  }

  const isOnboardingComplete = 
    account.details_submitted === true &&
    account.payouts_enabled === true;

  console.log(`Connect account ${connectAccountId} updated - onboarding complete: ${isOnboardingComplete}`);

  if (isOnboardingComplete) {
    const { error } = await supabaseAdmin
      .from("affiliates")
      .update({ stripe_onboarding_complete: true })
      .eq("stripe_connect_id", connectAccountId);

    if (error) {
      console.error("Error updating affiliate onboarding status:", error);
    } else {
      console.log(`Affiliate onboarding complete for Connect account: ${connectAccountId}`);
    }
  }
}