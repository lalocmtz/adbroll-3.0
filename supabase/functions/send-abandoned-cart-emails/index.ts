import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("Starting abandoned cart email job...");

    // Get email captures from 24+ hours ago that haven't converted and haven't received followup
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: abandonedEmails, error: fetchError } = await supabase
      .from("email_captures")
      .select("*")
      .is("converted_at", null)
      .is("followup_sent_at", null)
      .lt("created_at", twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error("Error fetching abandoned emails:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${abandonedEmails?.length || 0} abandoned carts to process`);

    let sent = 0;
    let failed = 0;

    for (const capture of abandonedEmails || []) {
      try {
        // Check if they have a referral code (discount available)
        const hasDiscount = !!capture.referral_code;

        // Send abandoned cart email using template
        const emailResponse = await supabase.functions.invoke("send-email", {
          body: {
            to: capture.email,
            template: "abandoned_cart",
            templateData: {
              hasDiscount: hasDiscount ? "true" : "false",
            },
          },
        });

        if (emailResponse.error) {
          console.error(`Failed to send to ${capture.email}:`, emailResponse.error);
          failed++;
          continue;
        }

        // Mark as sent
        const { error: updateError } = await supabase
          .from("email_captures")
          .update({ followup_sent_at: new Date().toISOString() })
          .eq("id", capture.id);

        if (updateError) {
          console.error(`Failed to update followup status for ${capture.email}:`, updateError);
        }

        sent++;
        console.log(`Sent abandoned cart email to ${capture.email}`);
      } catch (err) {
        console.error(`Error processing ${capture.email}:`, err);
        failed++;
      }
    }

    const result = {
      processed: abandonedEmails?.length || 0,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    };

    console.log("Abandoned cart job completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-abandoned-cart-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
