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
  console.log("=== Stripe Webhook Request Received ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  const signature = req.headers.get("stripe-signature");
  console.log("Signature present:", !!signature);
  console.log("Webhook secret configured:", !!Deno.env.get("STRIPE_WEBHOOK_SECRET"));
  
  if (!signature) {
    console.error("No signature header found");
    return new Response(JSON.stringify({ error: "No signature" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body: string;
  try {
    body = await req.text();
    console.log("Body length:", body.length);
  } catch (bodyError) {
    console.error("Error reading request body:", bodyError);
    return new Response(JSON.stringify({ error: "Failed to read body" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log("Attempting to verify webhook signature...");
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`✓ Webhook verified: ${event.type}`);
    console.log("Event ID:", event.id);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          console.log("Processing checkout.session.completed...");
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(session);
          console.log("✓ checkout.session.completed processed");
          break;
        }
        case "invoice.paid": {
          console.log("Processing invoice.paid...");
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(invoice);
          console.log("✓ invoice.paid processed");
          break;
        }
        case "invoice.payment_failed": {
          console.log("Processing invoice.payment_failed...");
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          console.log("✓ invoice.payment_failed processed");
          break;
        }
        case "customer.subscription.deleted": {
          console.log("Processing customer.subscription.deleted...");
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          console.log("✓ customer.subscription.deleted processed");
          break;
        }
        case "customer.subscription.updated": {
          console.log("Processing customer.subscription.updated...");
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          console.log("✓ customer.subscription.updated processed");
          break;
        }
        case "account.updated": {
          console.log("Processing account.updated...");
          const account = event.data.object as Stripe.Account;
          await handleAccountUpdated(account);
          console.log("✓ account.updated processed");
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (handlerError) {
      console.error("=== Handler Error ===");
      console.error("Event type:", event.type);
      console.error("Error:", handlerError);
      console.error("Error message:", handlerError instanceof Error ? handlerError.message : "Unknown");
      console.error("Error stack:", handlerError instanceof Error ? handlerError.stack : "No stack");
      throw handlerError;
    }

    console.log("=== Webhook processed successfully ===");
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    
    console.error("=== Webhook Error ===");
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", errorMessage);
    console.error("Error stack:", errorStack);
    console.error("Signature length:", signature?.length);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const priceUsd = 25; // Single price
  
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
        plan_tier: "pro",
      }, { onConflict: "id" });

      // Send account setup email
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
    .update({ 
      stripe_customer_id: customerId,
      plan_tier: "pro",
    })
    .eq("id", userId);

  // Create or update subscription record
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: "active",
      price_usd: priceUsd,
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Error creating subscription:", error);
  } else {
    console.log(`Subscription created for user: ${userId}`);

    // Mark email as converted in email_captures
    await supabaseAdmin
      .from("email_captures")
      .update({ converted_at: new Date().toISOString() })
      .eq("email", guestEmail || "");
    
    // Send subscription confirmation email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    
    if (profile?.email && !isNewAccount) {
      await sendEmail(profile.email, "subscription_confirmed", { 
        price: "25",
        plan: "Adbroll Pro",
      });
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

  const priceAmount = 25;

  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status: "active",
      renew_at: new Date(invoice.period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Subscription activated for user: ${profile.id}`);

  // For renewal payments, send confirmation email
  const isRenewal = invoice.billing_reason === "subscription_cycle";
  if (isRenewal && profile.email) {
    await sendEmail(profile.email, "subscription_confirmed", { 
      price: "25",
      plan: "Adbroll Pro",
    });
  }

  // Calculate affiliate commission
  if (profile.referral_code_used) {
    await calculateAffiliateCommission(profile.id, profile.referral_code_used, priceAmount, profile.email);
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
      })
      .eq("id", affiliate.id);

    // Send commission email to affiliate
    const { data: affiliateProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", affiliateCode.user_id)
      .single();

    if (affiliateProfile?.email) {
      await sendEmail(affiliateProfile.email, "affiliate_commission", {
        amount: commissionAmount.toFixed(2),
        referredEmail: referredEmail || "un usuario",
      });
    }

    console.log(`Affiliate commission: $${commissionAmount.toFixed(2)} for code ${referralCode}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for customer:", customerId);
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("user_id", profile.id);

  // Send payment failed email
  if (profile.email) {
    await sendEmail(profile.email, "payment_failed", {
      retryLink: "https://adbroll.com/settings",
    });
  }

  console.log(`Payment failed for user: ${profile.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for customer:", customerId);
    return;
  }

  // Update subscription status
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", profile.id);

  // Update profile plan
  await supabaseAdmin
    .from("profiles")
    .update({ plan_tier: null })
    .eq("id", profile.id);

  // Send cancellation email
  if (profile.email) {
    await sendEmail(profile.email, "subscription_cancelled", {});
  }

  console.log(`Subscription cancelled for user: ${profile.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("No profile found for customer:", customerId);
    return;
  }

  // Map Stripe status to our status
  let ourStatus = "active";
  if (status === "canceled" || status === "unpaid") {
    ourStatus = "cancelled";
  } else if (status === "past_due") {
    ourStatus = "past_due";
  } else if (status === "trialing") {
    ourStatus = "trialing";
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status: ourStatus,
      renew_at: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
    })
    .eq("user_id", profile.id);

  console.log(`Subscription updated for user: ${profile.id}, status: ${ourStatus}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Handle Stripe Connect account updates (for affiliates)
  const connectAccountId = account.id;
  const payoutsEnabled = account.payouts_enabled;
  const detailsSubmitted = account.details_submitted;

  console.log(`Connect account updated: ${connectAccountId}`);
  console.log(`Payouts enabled: ${payoutsEnabled}, Details submitted: ${detailsSubmitted}`);

  // Update affiliate record if exists
  await supabaseAdmin
    .from("affiliates")
    .update({
      stripe_onboarding_complete: detailsSubmitted && payoutsEnabled,
    })
    .eq("stripe_connect_id", connectAccountId);
}
