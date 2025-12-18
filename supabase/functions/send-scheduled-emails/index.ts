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
    console.log("Starting scheduled emails job...");

    const results = {
      renewalReminders: { sent: 0, failed: 0 },
      freeUserReminders: { sent: 0, failed: 0 },
    };

    // ====== 1. RENEWAL REMINDERS (3 days before renewal) ======
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStart = new Date(threeDaysFromNow);
    threeDaysStart.setHours(0, 0, 0, 0);
    const threeDaysEnd = new Date(threeDaysFromNow);
    threeDaysEnd.setHours(23, 59, 59, 999);

    const { data: renewingSubscriptions, error: renewError } = await supabase
      .from("subscriptions")
      .select("*, profiles!inner(email, full_name)")
      .eq("status", "active")
      .is("renewal_reminder_sent_at", null)
      .gte("renew_at", threeDaysStart.toISOString())
      .lte("renew_at", threeDaysEnd.toISOString());

    if (renewError) {
      console.error("Error fetching renewal subscriptions:", renewError);
    } else {
      console.log(`Found ${renewingSubscriptions?.length || 0} subscriptions renewing in 3 days`);

      for (const sub of renewingSubscriptions || []) {
        try {
          const profile = sub.profiles as any;
          if (!profile?.email) continue;

          const renewDate = new Date(sub.renew_at).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const emailResponse = await supabase.functions.invoke("send-email", {
            body: {
              to: profile.email,
              template: "renewal_reminder",
              templateData: {
                name: profile.full_name || "",
                price: sub.price_usd?.toString() || "29",
                renewDate,
              },
            },
          });

          if (emailResponse.error) {
            console.error(`Failed to send renewal reminder to ${profile.email}:`, emailResponse.error);
            results.renewalReminders.failed++;
            continue;
          }

          // Mark as sent
          await supabase
            .from("subscriptions")
            .update({ renewal_reminder_sent_at: new Date().toISOString() })
            .eq("id", sub.id);

          results.renewalReminders.sent++;
          console.log(`Sent renewal reminder to ${profile.email}`);
        } catch (err) {
          console.error(`Error processing renewal reminder:`, err);
          results.renewalReminders.failed++;
        }
      }
    }

    // ====== 2. FREE USER REMINDERS (3 days after registration without subscription) ======
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStart = new Date(threeDaysAgo);
    threeDaysAgoStart.setHours(0, 0, 0, 0);
    const threeDaysAgoEnd = new Date(threeDaysAgo);
    threeDaysAgoEnd.setHours(23, 59, 59, 999);

    // Get free users who registered 3 days ago
    const { data: freeUsers, error: freeError } = await supabase
      .from("profiles")
      .select("*")
      .eq("plan", "free")
      .is("reminder_email_sent_at", null)
      .gte("created_at", threeDaysAgoStart.toISOString())
      .lte("created_at", threeDaysAgoEnd.toISOString());

    if (freeError) {
      console.error("Error fetching free users:", freeError);
    } else {
      console.log(`Found ${freeUsers?.length || 0} free users from 3 days ago`);

      for (const user of freeUsers || []) {
        try {
          if (!user.email) continue;

          // Double check they don't have a subscription
          const { data: hasSub } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle();

          if (hasSub) {
            // They subscribed, don't send reminder
            continue;
          }

          const emailResponse = await supabase.functions.invoke("send-email", {
            body: {
              to: user.email,
              template: "free_user_reminder",
              templateData: {
                name: user.full_name || "",
              },
            },
          });

          if (emailResponse.error) {
            console.error(`Failed to send free user reminder to ${user.email}:`, emailResponse.error);
            results.freeUserReminders.failed++;
            continue;
          }

          // Mark as sent
          await supabase
            .from("profiles")
            .update({ reminder_email_sent_at: new Date().toISOString() })
            .eq("id", user.id);

          results.freeUserReminders.sent++;
          console.log(`Sent free user reminder to ${user.email}`);
        } catch (err) {
          console.error(`Error processing free user reminder:`, err);
          results.freeUserReminders.failed++;
        }
      }
    }

    const finalResult = {
      ...results,
      timestamp: new Date().toISOString(),
    };

    console.log("Scheduled emails job completed:", finalResult);

    return new Response(JSON.stringify(finalResult), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-scheduled-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
