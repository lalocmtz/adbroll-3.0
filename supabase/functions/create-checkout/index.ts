import { normalizeReferralCode, validateMonthlyPrice, validateReferralCoupon } from "../_shared/billing.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Check if user already has a Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, referral_code_used")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

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
        console.error("Error updating stripe_customer_id:", updateError);
      } else {
        console.log(`Saved stripe_customer_id ${customerId} for user ${user.id}`);
      }
    }

    // Single plan: Pro at $30
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
    const isNewCustomer = previousSubscriptions.data.length === 0;
    const candidateCode = normalizeReferralCode(profile?.referral_code_used || referral_code);
    const { data: affiliateCode } = candidateCode ? await supabaseAdmin.from("affiliate_codes").select("code,user_id").eq("code", candidateCode).maybeSingle() : { data: null };
    const validCode = affiliateCode?.user_id !== user.id ? affiliateCode?.code : null;
    const metadata = { supabase_user_id: user.id, plan_type: "pro", price_usd: "30", referral_code: validCode || "" };

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
    const coupon = Deno.env.get("STRIPE_COUPON_ID");
    if (validCode && isNewCustomer) {
      if (!coupon) throw new Error("El descuento de referido aún no está configurado");
      validateReferralCoupon(await stripe.coupons.retrieve(coupon), typeof price.product === "string" ? price.product : price.product.id);
      sessionParams.discounts = [{ coupon }];
    }
    // A still-open checkout is reused to avoid duplicate subscriptions from repeated clicks.
    const openSessions = await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 });
    for (const openSession of openSessions.data) {
      if (openSession.mode !== "subscription") continue;
      if (openSession.metadata?.referral_code === (validCode || "") && openSession.metadata?.price_usd === "30") {
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