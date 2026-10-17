import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json", "Cache-Control": "no-store" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  try {
    const { session_id } = await req.json();
    if (typeof session_id !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id)) {
      return new Response(JSON.stringify({ paid: false }), { status: 400, headers });
    }
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    // A checkout ID is a capability: expose no customer, email or account data.
    const paid = session.mode === "subscription" && session.status === "complete" && session.payment_status === "paid";
    return new Response(JSON.stringify({ paid, amount: paid ? session.amount_total : null, currency: paid ? session.currency : null }), { headers });
  } catch {
    return new Response(JSON.stringify({ paid: false }), { status: 400, headers });
  }
});
