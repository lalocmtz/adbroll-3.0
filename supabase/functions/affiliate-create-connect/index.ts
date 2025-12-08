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
      .select("id, stripe_connect_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("No affiliate account found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    let accountId = affiliate.stripe_connect_id;

    // If no Connect account exists, create one
    if (!accountId) {
      console.log("Creating Stripe Connect Express account for user:", user.id);
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "MX", // Default to Mexico, can be changed during onboarding
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          user_id: user.id,
          affiliate_id: affiliate.id,
        },
      });

      accountId = account.id;

      // Save Connect account ID to database
      await supabaseAdmin
        .from("affiliates")
        .update({ stripe_connect_id: accountId })
        .eq("id", affiliate.id);

      console.log("Stripe Connect account created:", accountId);
    }

    // Generate onboarding link
    const { origin } = new URL(req.url);
    const baseUrl = Deno.env.get("SITE_URL") || "https://adbroll.lovable.app";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/affiliates?refresh=true`,
      return_url: `${baseUrl}/affiliates?connected=true`,
      type: "account_onboarding",
    });

    console.log("Onboarding link created for account:", accountId);

    return new Response(
      JSON.stringify({ 
        url: accountLink.url,
        account_id: accountId,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating Connect account:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
