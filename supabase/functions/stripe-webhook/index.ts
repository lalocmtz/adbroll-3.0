import { commissionBaseCents, stripeSubscriptionStatus } from "../_shared/billing.ts";
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
        case "charge.refunded": {
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        }
        case "charge.dispute.created": {
          // Disputes require manual reconciliation before any further payouts.
          const dispute = event.data.object as Stripe.Dispute;
          const customerCharge = await stripe.charges.retrieve(typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id);
          const customerId = typeof customerCharge.customer === "string" ? customerCharge.customer : customerCharge.customer?.id;
          if (customerId) {
            const { data: referred, error: lookupError } = await supabaseAdmin.from("profiles").select("referral_code_used").eq("stripe_customer_id", customerId).maybeSingle();
            if (lookupError) throw lookupError;
            if (referred?.referral_code_used) {
              const { error } = await supabaseAdmin.from("affiliates").update({ payout_hold: true }).eq("ref_code", referred.referral_code_used);
              if (error) throw error;
            }
          }
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
  if (session.mode !== "subscription" || session.payment_status !== "paid") return;
  if (session.metadata?.plan !== "pro" && session.metadata?.plan_type !== "pro") return;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const priceUsd = 30; // Single price (TokXray Pro)

  // Para checkouts fríos (1 clic directo a Stripe) NO mandamos guest_email en
  // metadata; Stripe recolecta el email en su página. Lo tomamos de
  // customer_details.email como respaldo para poder crear la cuenta igual.
  const guestEmail = session.metadata?.guest_email || session.customer_details?.email || undefined;
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
      email_confirm: false,
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
        setupLink: "https://tokxray.com/checkout/success",
      });
    }
  }

  if (!userId) {
    throw new Error("No user ID found for checkout session; retry required");
  }

  if (referralCode) {
    const { data: code } = await supabaseAdmin.from("affiliate_codes").select("user_id,code").eq("code", referralCode).maybeSingle();
    if (code && code.user_id !== userId) {
      const { error: referralError } = await supabaseAdmin.from("profiles").update({ referral_code_used: code.code }).eq("id", userId).is("referral_code_used", null);
      if (referralError) throw referralError;
    }
  }

  // Read current state so a delayed checkout event cannot reactivate a cancelled subscription.
  const currentCheckoutSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const { data: existingSubscription, error: existingError } = await supabaseAdmin.from("subscriptions")
    .select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
  if (existingError) throw existingError;
  if (existingSubscription?.stripe_subscription_id && existingSubscription.stripe_subscription_id !== subscriptionId) {
    const existingStripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id);
    if (existingStripeSubscription.created > currentCheckoutSubscription.created) return;
  }
  // Update profile with stripe customer ID
  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({ 
      stripe_customer_id: customerId,
      plan_tier: currentCheckoutSubscription.status === "active" ? "pro" : null,
    })
    .eq("id", userId);
  if (profileUpdateError) throw profileUpdateError;

  // Create or update subscription record
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: stripeSubscriptionStatus(currentCheckoutSubscription.status),
      price_usd: currentCheckoutSubscription.items.data[0]?.price.unit_amount ? currentCheckoutSubscription.items.data[0].price.unit_amount / 100 : priceUsd,
      renew_at: new Date(currentCheckoutSubscription.current_period_end * 1000).toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    throw error;
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
        price: "30",
        plan: "TokXray Pro",
      });
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, referral_code_used")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    throw new Error(`Profile not ready for customer ${customerId}; retry required`);
  }

  const priceAmount = commissionBaseCents(invoice) / 100;
  const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!profile.referral_code_used && currentSubscription.metadata?.referral_code) {
    const { data: code, error: codeError } = await supabaseAdmin.from("affiliate_codes").select("code,user_id").eq("code", currentSubscription.metadata.referral_code).maybeSingle();
    if (codeError) throw codeError;
    if (code && code.user_id !== profile.id) {
      const { error: attributionError } = await supabaseAdmin.from("profiles").update({ referral_code_used: code.code }).eq("id",profile.id).is("referral_code_used",null);
      if (attributionError) throw attributionError;
      profile.referral_code_used = code.code;
    }
  }
  const { error: subscriptionError } = await supabaseAdmin.from("subscriptions")
    .update({ status: stripeSubscriptionStatus(currentSubscription.status), renew_at: new Date(currentSubscription.current_period_end * 1000).toISOString() })
    .eq("stripe_subscription_id", subscriptionId);
  if (subscriptionError) throw subscriptionError;

  console.log(`Subscription activated for user: ${profile.id}`);

  // For renewal payments, send confirmation email
  const isRenewal = invoice.billing_reason === "subscription_cycle";
  if (isRenewal && profile.email) {
    await sendEmail(profile.email, "subscription_confirmed", { 
      price: "30",
      plan: "TokXray Pro",
    });
  }

  // Calculate affiliate commission.
  // billing_reason: 'subscription_create' = primer pago, 'subscription_cycle' = renovación.
  // Marcamos el type para distinguir comisión inicial vs recurrente. La idempotencia
  // por stripe_invoice_id evita que un invoice reintentado pague dos veces.
  if (profile.referral_code_used) {
    const commissionType = invoice.billing_reason === "subscription_cycle" ? "recurring" : "initial";
    await calculateAffiliateCommission(
      profile.id,
      profile.referral_code_used,
      priceAmount,
      profile.email,
      invoice.id,
      commissionType
    );
  }
}

async function calculateAffiliateCommission(
  referredUserId: string,
  referralCode: string,
  amountPaid: number,
  referredEmail?: string,
  stripeInvoiceId?: string,
  commissionType: "initial" | "recurring" = "recurring"
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

  // Insert the invoice and increment balances in ONE database transaction.
  const { data: recorded, error: commissionError } = await supabaseAdmin.rpc("record_affiliate_commission", {
    p_referred_user_id: referredUserId, p_code: referralCode,
    p_invoice_id: stripeInvoiceId, p_amount_paid_cents: Math.round(amountPaid * 100), p_type: commissionType,
  });
  if (commissionError) throw commissionError;
  if (!recorded) return;
  const { data: affiliate } = await supabaseAdmin.from("affiliates")
    .select("user_id").eq("user_id", affiliateCode.user_id).single();
  if (affiliate) {
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

    console.log(`Affiliate commission (${commissionType}): $${commissionAmount.toFixed(2)} for code ${referralCode}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
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
    .update({ status: stripeSubscriptionStatus((await stripe.subscriptions.retrieve(invoice.subscription as string)).status) })
    .eq("stripe_subscription_id", invoice.subscription as string);

  // Send payment failed email
  if (profile.email) {
    await sendEmail(profile.email, "payment_failed", {
      retryLink: "https://tokxray.com/settings",
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
    .eq("stripe_subscription_id", subscription.id);

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
  subscription = await stripe.subscriptions.retrieve(subscription.id);
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
  const ourStatus = stripeSubscriptionStatus(status);

  await supabaseAdmin
    .from("subscriptions")
    .update({ 
      status: ourStatus,
      renew_at: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
    })
    .eq("stripe_subscription_id", subscription.id);

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
      payouts_enabled: payoutsEnabled,
    })
    .eq("stripe_connect_id", connectAccountId);
}

async function handleChargeRefunded(eventCharge: Stripe.Charge) {
  const charge = await stripe.charges.retrieve(eventCharge.id);
  if (!charge.invoice || charge.currency !== "usd") return;
  const invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice.id;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  if (!invoice.subscription) return;
  // Handle delivery before invoice.paid by idempotently recording the original commission first.
  await handleInvoicePaid(invoice);
  const { error } = await supabaseAdmin.rpc("reconcile_affiliate_refund", {
    p_invoice_id: invoiceId, p_refunded_cents: charge.amount_refunded, p_charged_cents: charge.amount,
  });
  if (error) throw error;
}
