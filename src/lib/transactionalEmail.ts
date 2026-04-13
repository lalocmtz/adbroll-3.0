import { supabase } from "@/integrations/supabase/client";

/**
 * Transactional email events supported by the system
 */
export type EmailEvent =
  | "user_registered"
  | "creator_registered"
  | "campaign_created"
  | "video_approved"
  | "video_purchased";

/**
 * Maps email events to inline template names
 * These match the template keys in supabase/functions/send-email/index.ts
 */
const TEMPLATE_MAP: Record<EmailEvent, string> = {
  user_registered: "welcome_free",
  creator_registered: "brand_registered",
  campaign_created: "campaign_new",
  video_approved: "video_approved",
  video_purchased: "video_purchased",
};

/**
 * Send a transactional email for a specific event
 * Handles errors silently to not block main application flows
 * 
 * @param event - The email event type
 * @param to - Recipient email address
 * @param variables - Dynamic variables for the email template
 */
export async function sendTransactionalEmail(
  event: EmailEvent,
  to: string,
  variables: Record<string, string>
): Promise<boolean> {
  // Validate email
  if (!to || !to.includes("@")) {
    console.warn(`[Email] Invalid email address for ${event}:`, to);
    return false;
  }

  try {
    const templateName = TEMPLATE_MAP[event];
    
    console.log(`[Email] Sending ${event} (${templateName}) to ${to}`);

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        template: templateName,
        templateData: variables,
      },
    });

    if (error) {
      console.error(`[Email] Failed to send ${event}:`, error);
      return false;
    }

    console.log(`[Email] Successfully sent ${event} to ${to}`);
    return true;
  } catch (error) {
    // Log error but don't throw - emails should never block main flows
    console.error(`[Email] Error sending ${event} to ${to}:`, error);
    return false;
  }
}

/**
 * Convenience functions for specific email events
 */
export const emailEvents = {
  userRegistered: (email: string, name: string) =>
    sendTransactionalEmail("user_registered", email, { name }),

  creatorRegistered: (email: string, name: string) =>
    sendTransactionalEmail("creator_registered", email, { name }),

  campaignCreated: (
    email: string,
    name: string,
    campaign: string,
    minPayment: string,
    maxPayment: string,
    ctaUrl: string
  ) =>
    sendTransactionalEmail("campaign_created", email, {
      name,
      campaign,
      min_payment: minPayment,
      max_payment: maxPayment,
      cta_url: ctaUrl,
    }),

  videoApproved: (email: string, name: string, campaign: string, ctaUrl: string) =>
    sendTransactionalEmail("video_approved", email, {
      name,
      campaign,
      cta_url: ctaUrl,
    }),

  videoPurchased: (email: string, name: string, campaign: string, price: string) =>
    sendTransactionalEmail("video_purchased", email, {
      name,
      campaign,
      price,
    }),
};
