// Analytics utility for Facebook Pixel and Google Analytics
// With server-side Meta Conversions API support

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Server-side Meta Conversions API
interface ConversionEvent {
  event_name: string;
  event_time?: number;
  event_source_url?: string;
  user_data?: {
    email?: string;
    phone?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
  };
  action_source?: string;
}

// Get Facebook cookies for better attribution
const getFacebookCookies = () => {
  const cookies: { fbc?: string; fbp?: string } = {};
  if (typeof document !== "undefined") {
    const cookieString = document.cookie;
    const fbcMatch = cookieString.match(/_fbc=([^;]+)/);
    const fbpMatch = cookieString.match(/_fbp=([^;]+)/);
    if (fbcMatch) cookies.fbc = fbcMatch[1];
    if (fbpMatch) cookies.fbp = fbpMatch[1];
  }
  return cookies;
};

// Send event to server-side Meta Conversions API
const sendServerEvent = async (events: ConversionEvent[]) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[Meta Server] VITE_SUPABASE_URL not configured');
      return;
    }

    const fbCookies = getFacebookCookies();
    
    // Enhance events with cookies and URL
    const enhancedEvents = events.map(event => ({
      ...event,
      event_source_url: event.event_source_url || window.location.href,
      user_data: {
        ...event.user_data,
        ...fbCookies,
      },
    }));

    const response = await fetch(`${supabaseUrl}/functions/v1/meta-conversions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: enhancedEvents }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Meta Server] Error:', error);
    } else {
      const result = await response.json();
      console.log('[Meta Server] Events sent:', result.events_received);
    }
  } catch (error) {
    console.error('[Meta Server] Failed to send event:', error);
  }
};

// Facebook Pixel Events (browser-side)
export const trackFBEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, params);
    console.log(`[FB Pixel] ${eventName}`, params);
  }
};

export const trackFBCustomEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", eventName, params);
    console.log(`[FB Pixel Custom] ${eventName}`, params);
  }
};

// Google Analytics Events
export const trackGAEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
    console.log(`[GA] ${eventName}`, params);
  }
};

// Combined tracking functions for common events (browser + server)
export const trackPageView = (pageName: string) => {
  trackFBEvent("PageView");
  trackGAEvent("page_view", { page_title: pageName });
  
  // Server-side
  sendServerEvent([{
    event_name: "PageView",
    custom_data: {
      content_name: pageName,
    },
  }]);
};

export const trackViewContent = (contentName: string, contentId?: string, value?: number) => {
  trackFBEvent("ViewContent", {
    content_name: contentName,
    content_ids: contentId ? [contentId] : undefined,
    value: value,
    currency: "USD",
  });
  trackGAEvent("view_item", {
    item_name: contentName,
    item_id: contentId,
    value: value,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "ViewContent",
    custom_data: {
      content_name: contentName,
      content_ids: contentId ? [contentId] : undefined,
      value: value,
      currency: "USD",
    },
  }]);
};

export const trackInitiateCheckout = (value: number, currency: string = "USD") => {
  trackFBEvent("InitiateCheckout", {
    value: value,
    currency: currency,
  });
  trackGAEvent("begin_checkout", {
    value: value,
    currency: currency,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "InitiateCheckout",
    custom_data: {
      value: value,
      currency: currency,
    },
  }]);
};

export const trackPurchase = (value: number, currency: string = "USD", transactionId?: string, email?: string) => {
  trackFBEvent("Purchase", {
    value: value,
    currency: currency,
  });
  trackGAEvent("purchase", {
    transaction_id: transactionId,
    value: value,
    currency: currency,
  });
  
  // Server-side (with optional email for better matching)
  sendServerEvent([{
    event_name: "Purchase",
    user_data: email ? { email } : undefined,
    custom_data: {
      value: value,
      currency: currency,
    },
  }]);
};

export const trackLead = (source: string, email?: string) => {
  trackFBEvent("Lead", {
    content_name: source,
  });
  trackGAEvent("generate_lead", {
    source: source,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "Lead",
    user_data: email ? { email } : undefined,
    custom_data: {
      content_name: source,
    },
  }]);
};

export const trackSignUp = (method: string = "email", email?: string) => {
  trackFBEvent("CompleteRegistration", {
    content_name: method,
  });
  trackGAEvent("sign_up", {
    method: method,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "CompleteRegistration",
    user_data: email ? { email } : undefined,
    custom_data: {
      content_name: method,
    },
  }]);
};

export const trackAddToCart = (itemName: string, value: number) => {
  trackFBEvent("AddToCart", {
    content_name: itemName,
    value: value,
    currency: "USD",
  });
  trackGAEvent("add_to_cart", {
    item_name: itemName,
    value: value,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "AddToCart",
    custom_data: {
      content_name: itemName,
      value: value,
      currency: "USD",
    },
  }]);
};

// Video-specific events
export const trackVideoView = (videoId: string, revenue?: number) => {
  trackFBCustomEvent("VideoView", {
    video_id: videoId,
    revenue: revenue,
  });
  trackGAEvent("video_view", {
    video_id: videoId,
    revenue: revenue,
  });
};

export const trackScriptAnalysis = (videoId: string) => {
  trackFBCustomEvent("ScriptAnalysis", {
    video_id: videoId,
  });
  trackGAEvent("script_analysis", {
    video_id: videoId,
  });
};

// Campaign events
export const trackCampaignView = (campaignId: string, brandName: string) => {
  trackFBCustomEvent("CampaignView", {
    campaign_id: campaignId,
    brand_name: brandName,
  });
  trackGAEvent("campaign_view", {
    campaign_id: campaignId,
    brand_name: brandName,
  });
};

export const trackCampaignApply = (campaignId: string, proposedPrice: number) => {
  trackFBCustomEvent("CampaignApply", {
    campaign_id: campaignId,
    proposed_price: proposedPrice,
  });
  trackGAEvent("campaign_apply", {
    campaign_id: campaignId,
    proposed_price: proposedPrice,
  });
};

// Subscribe event
export const trackSubscribe = (planName: string, value: number, currency: string = "USD", email?: string) => {
  trackFBEvent("Subscribe", {
    value: value,
    currency: currency,
    predicted_ltv: value * 12,
  });
  trackGAEvent("subscribe", {
    plan: planName,
    value: value,
    currency: currency,
  });
  
  // Server-side
  sendServerEvent([{
    event_name: "Subscribe",
    user_data: email ? { email } : undefined,
    custom_data: {
      content_name: planName,
      value: value,
      currency: currency,
    },
  }]);
};
