import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    // Get affiliate data
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from("affiliates")
      .select("stripe_connect_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("No affiliate account found");
    }

    if (!affiliate.stripe_connect_id) {
      throw new Error("No Stripe Connect account linked");
    }

    if (!affiliate.stripe_onboarding_complete) {
      throw new Error("Stripe account onboarding not complete");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Generate login link to Stripe Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      affiliate.stripe_connect_id
    );

    console.log("Dashboard link created for account:", affiliate.stripe_connect_id);

    return new Response(
      JSON.stringify({ url: loginLink.url }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating dashboard link:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
