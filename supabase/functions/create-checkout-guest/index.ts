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
    const { email, referral_code, plan = 'pro' } = await req.json();

    const normalizedEmail =
      typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;

    console.log(
      `Creating checkout for guest${normalizedEmail ? ` email: ${normalizedEmail}` : " (no email)"}, plan: ${plan}`
    );

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Resolve / create a Stripe customer only when we already know the email.
    // Without an email we let Stripe Checkout collect it and create the
    // customer for us (customer_creation: "always").
    let customerId: string | null = null;

    if (normalizedEmail) {
      const existingCustomers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log(`Found existing Stripe customer: ${customerId}`);
      } else {
        const customer = await stripe.customers.create({
          email: normalizedEmail,
          metadata: {
            source: "guest_checkout",
            referral_code: referral_code || "",
            plan: plan,
          },
        });
        customerId = customer.id;
        console.log(`Created new Stripe customer: ${customerId}`);
      }
    }

    // Determine which price ID to use based on plan
    const priceId = plan === 'premium'
      ? Deno.env.get("STRIPE_PRICE_ID_PREMIUM")
      : Deno.env.get("STRIPE_PRICE_ID_PRO");

    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}`);
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata: {
        referral_code: referral_code || "",
        create_account_on_success: "true",
        plan: plan,
      },
    };

    if (customerId) {
      // Known customer: reuse it and let Stripe auto-fill the address.
      sessionParams.customer = customerId;
      sessionParams.customer_update = { address: "auto" };
      if (normalizedEmail) {
        sessionParams.metadata!.guest_email = normalizedEmail;
      }
    } else {
      // Cold visitor: Stripe collects the email + card and creates the
      // customer. customer_update requires an existing customer, so it is
      // intentionally omitted here.
      sessionParams.customer_creation = "always";
    }

    // Apply referral coupon if valid code provided
    if (referral_code) {
      const { data: validCode } = await supabaseAdmin
        .from("affiliate_codes")
        .select("code")
        .eq("code", referral_code.toUpperCase())
        .maybeSingle();

      if (validCode) {
        sessionParams.discounts = [
          {
            coupon: Deno.env.get("STRIPE_COUPON_ID"),
          },
        ];
        console.log(`Applying referral coupon for code: ${referral_code}`);
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Guest checkout session created: ${session.id} for ${normalizedEmail ?? "anonymous"}, plan: ${plan}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating guest checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});