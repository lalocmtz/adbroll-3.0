import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit pack configurations
const CREDIT_PACKS = {
  pack_3: {
    credits: 3,
    priceUsd: 9.99,
    priceIdEnvVar: "STRIPE_PRICE_ID_PACK_3",
  },
  pack_10: {
    credits: 10,
    priceUsd: 24.99,
    priceIdEnvVar: "STRIPE_PRICE_ID_PACK_10",
  },
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
    const { pack } = await req.json();

    // Validate pack type
    if (!pack || !CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS]) {
      throw new Error("Invalid pack type. Must be 'pack_3' or 'pack_10'");
    }

    const packConfig = CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS];
    const priceId = Deno.env.get(packConfig.priceIdEnvVar);

    if (!priceId) {
      throw new Error(`Price ID not configured for pack: ${pack}`);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Check if user already has a Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
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
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Create one-time payment checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=credits`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata: {
        supabase_user_id: user.id,
        purchase_type: "credits",
        pack_type: pack,
        credits_purchased: packConfig.credits.toString(),
        amount_usd: packConfig.priceUsd.toString(),
      },
    });

    console.log(`Credit pack checkout session created: ${session.id} for user: ${user.id}, pack: ${pack}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating credit checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
