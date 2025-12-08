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
    const { email, referral_code } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Creating checkout for guest email: ${email}`);

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Check if a customer with this email already exists in Stripe
    const existingCustomers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log(`Found existing Stripe customer: ${customerId}`);
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: email.toLowerCase(),
        metadata: {
          source: "guest_checkout",
          referral_code: referral_code || "",
        },
      });
      customerId = customer.id;
      console.log(`Created new Stripe customer: ${customerId}`);
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: Deno.env.get("STRIPE_PRICE_ID_PRO"),
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata: {
        guest_email: email.toLowerCase(),
        referral_code: referral_code || "",
        create_account_on_success: "true",
      },
      customer_update: {
        address: "auto",
      },
    };

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

    console.log(`Guest checkout session created: ${session.id} for email: ${email}`);

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
