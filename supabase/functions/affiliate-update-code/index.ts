import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { new_code } = await req.json();

    if (!new_code || typeof new_code !== "string") {
      throw new Error("Invalid code provided");
    }

    // Normalize code: uppercase, alphanumeric only, 4-12 chars
    const normalizedCode = new_code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    if (normalizedCode.length < 4 || normalizedCode.length > 12) {
      throw new Error("Code must be 4-12 alphanumeric characters");
    }

    // Check if code already exists (excluding current user)
    const { data: existingCode } = await supabaseAdmin
      .from("affiliate_codes")
      .select("id")
      .eq("code", normalizedCode)
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingCode) {
      throw new Error("This code is already taken");
    }

    // Update code in affiliate_codes table
    const { error: codeError } = await supabaseAdmin
      .from("affiliate_codes")
      .update({ code: normalizedCode })
      .eq("user_id", user.id);

    if (codeError) {
      throw new Error(`Error updating affiliate_codes: ${codeError.message}`);
    }

    // Update code in affiliates table
    const { error: affiliateError } = await supabaseAdmin
      .from("affiliates")
      .update({ ref_code: normalizedCode })
      .eq("user_id", user.id);

    if (affiliateError) {
      throw new Error(`Error updating affiliates: ${affiliateError.message}`);
    }

    console.log(`Code updated for user ${user.id}: ${normalizedCode}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        code: normalizedCode,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating code:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
