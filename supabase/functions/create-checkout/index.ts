import { BILLING_POLICY, MONTHLY_PRICE_CENTS, normalizeReferralCode, validateMonthlyPrice } from "../_shared/billing.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A failed or expired checkout is not a first payment. Inspect paid invoices for
// this product only; refunded payments still count, so the bonus cannot be farmed.
async function hasPaidTokXrayInvoice(stripe: Stripe, customerId: string, productId: string): Promise<boolean> {
  let invoiceCursor: string | undefined;
  while (true) {
    const page = await stripe.invoices.list({ customer: customerId, status: "paid", limit: 100, ...(invoiceCursor ? { starting_after: invoiceCursor } : {}) });
    for (const invoice of page.data) {
      if (invoice.amount_paid <= 0) continue;
      let lines = invoice.lines;
      while (true) {
        if (lines.data.some(line => line.amount > 0 && (typeof line.price?.product === "string" ? line.price.product : line.price?.product?.id) === productId)) return true;
        if (!lines.has_more) break;
        const lineCursor = lines.data[lines.data.length - 1]?.id;
        if (!lineCursor) throw new Error("No se pudo verificar el historial de pagos");
        lines = await stripe.invoices.listLineItems(invoice.id, { limit: 100, starting_after: lineCursor });
      }
    }
    if (!page.has_more) return false;
    const nextCursor = page.data[page.data.length - 1]?.id;
    if (!nextCursor || nextCursor === invoiceCursor) throw new Error("No se pudo verificar el historial de pagos");
    invoiceCursor = nextCursor;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use anon key for auth operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Use service role for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    if (!user.email_confirmed_at) throw new Error("Confirma tu correo antes de suscribirte");
    const { referral_code } = await req.json();

    const { data: lifetimeGrant, error: grantError } = await supabaseAdmin
      .from("creator_program_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("access_kind", "lifetime")
      .not("approved_at", "is", null)
      .is("subscription_ends_at", null)
      .limit(1);
    if (grantError) throw grantError;
    if (lifetimeGrant?.length) throw new Error("Ya tienes acceso vitalicio. Entra a la plataforma sin contratar una suscripción.");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Check if user already has a Stripe customer
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, referral_code_used")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw profileError || new Error("Profile missing");
    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      }, { idempotencyKey: `tokxray-customer-${user.id}` });
      customerId = customer.id;

      // Save customer ID to profile using admin client to bypass RLS
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      
      if (updateError) {
        throw updateError;
      } else {
        console.log(`Saved stripe_customer_id ${customerId} for user ${user.id}`);
      }
    }

    // Current plan for new subscriptions: Pro at $15; existing subscriptions are untouched.
    const priceId = Deno.env.get("STRIPE_PRICE_ID_PRO");

    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID_PRO not configured");
    }

    const price = await stripe.prices.retrieve(priceId);
    validateMonthlyPrice(price);
    const previousSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (previousSubscriptions.data.some((subscription: Stripe.Subscription) => !["canceled", "incomplete_expired"].includes(subscription.status))) {
      throw new Error("Ya tienes una suscripción. Adminístrala desde Configuración.");
    }
    const productId = typeof price.product === "string" ? price.product : price.product.id;
    const isNewCustomer = !(await hasPaidTokXrayInvoice(stripe, customerId, productId));
    const candidateCode = normalizeReferralCode(profile?.referral_code_used || referral_code);
    const { data: affiliateCode } = candidateCode ? await supabaseAdmin.from("affiliate_codes").select("code,user_id").eq("code", candidateCode).maybeSingle() : { data: null };
    const validCode = affiliateCode?.user_id !== user.id ? affiliateCode?.code : null;
    const metadata = { supabase_user_id: user.id, plan_type: "pro", price_usd: String(MONTHLY_PRICE_CENTS / 100), billing_policy: BILLING_POLICY, checkout_brand: "tokxray-v1", first_purchase: String(isNewCustomer), referral_code: validCode || "" };

    // Build checkout session params
    // Session-level branding keeps the shared Stripe account unchanged.
    // The older SDK type predates this additive Stripe API field.
    const sessionParams: Stripe.Checkout.SessionCreateParams & { branding_settings: { display_name: string; button_color: string; icon: { type: "url"; url: string } } } = {
      branding_settings: {
        display_name: "TokXray",
        button_color: "#e92350",
        icon: { type: "url", url: "https://tokxray.com/brand/tokxray-social-1024.png" },
      },
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `https://tokxray.com/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://tokxray.com/checkout/cancel`,
      metadata,
      subscription_data: { metadata },
    };
    // Referral codes attribute commissions. The current policy charges $15
    // from the first invoice; it never applies the previous launch coupon.
    // A still-open checkout is reused to avoid duplicate subscriptions from repeated clicks.
    const openSessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    for (const openSession of openSessions.data) {
      if (openSession.mode !== "subscription" || openSession.metadata?.supabase_user_id !== user.id || openSession.metadata?.plan_type !== "pro") continue;
      if (openSession.metadata?.referral_code === (validCode || "") && openSession.metadata?.price_usd === String(MONTHLY_PRICE_CENTS / 100) && openSession.metadata?.billing_policy === BILLING_POLICY && openSession.metadata?.first_purchase === String(isNewCustomer) && openSession.metadata?.checkout_brand === "tokxray-v1") {
        return new Response(JSON.stringify({ url: openSession.url }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await stripe.checkout.sessions.expire(openSession.id);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Checkout session created: ${session.id} for user: ${user.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
