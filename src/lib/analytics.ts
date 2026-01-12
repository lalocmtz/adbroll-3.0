// Analytics utility for Facebook Pixel and Google Analytics
// With server-side Meta Conversions API support and event deduplication

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Generate unique event ID for deduplication between browser and server
export const generateEventId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Server-side Meta Conversions API
interface ConversionEvent {
  event_name: string;
  event_id?: string; // For deduplication
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

// Generate or retrieve session ID for visitor tracking
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("adbroll_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("adbroll_session_id", sessionId);
  }
  return sessionId;
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

// Track page view internally for analytics
const trackInternalPageView = async (pageName: string) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;

    const sessionId = getSessionId();
    
    await fetch(`${supabaseUrl}/functions/v1/track-page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_path: pageName,
        session_id: sessionId,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      }),
    });
  } catch (error) {
    // Silent fail - don't block user experience
    console.error('[Internal Analytics] Failed to track:', error);
  }
};

// Facebook Pixel Events (browser-side)
export const trackFBEvent = (eventName: string, params?: Record<string, any>, eventId?: string) => {
  if (typeof window !== "undefined" && window.fbq) {
    const eventParams = eventId ? { ...params, eventID: eventId } : params;
    window.fbq("track", eventName, eventParams);
    console.log(`[FB Pixel] ${eventName}`, eventParams);
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

// Combined tracking functions for common events (browser + server + internal)
export const trackPageView = (pageName: string) => {
  const eventId = generateEventId();
  
  trackFBEvent("PageView", { content_name: pageName }, eventId);
  trackGAEvent("page_view", { page_title: pageName });
  
  // Internal tracking for admin dashboard
  trackInternalPageView(pageName);
  
  // Server-side Meta with same event_id for deduplication
  sendServerEvent([{
    event_name: "PageView",
    event_id: eventId,
    custom_data: {
      content_name: pageName,
    },
  }]);
};

export const trackViewContent = (contentName: string, contentId?: string, value?: number) => {
  const eventId = generateEventId();
  
  trackFBEvent("ViewContent", {
    content_name: contentName,
    content_ids: contentId ? [contentId] : undefined,
    value: value,
    currency: "USD",
  }, eventId);
  trackGAEvent("view_item", {
    item_name: contentName,
    item_id: contentId,
    value: value,
  });
  
  // Server-side with deduplication
  sendServerEvent([{
    event_name: "ViewContent",
    event_id: eventId,
    custom_data: {
      content_name: contentName,
      content_ids: contentId ? [contentId] : undefined,
      value: value,
      currency: "USD",
    },
  }]);
};

export const trackInitiateCheckout = (value: number, currency: string = "USD", planName?: string) => {
  const eventId = generateEventId();
  
  trackFBEvent("InitiateCheckout", {
    value: value,
    currency: currency,
    content_name: planName,
  }, eventId);
  trackGAEvent("begin_checkout", {
    value: value,
    currency: currency,
    item_name: planName,
  });
  
  // Store checkout info for Purchase tracking
  if (typeof window !== "undefined") {
    localStorage.setItem("adbroll_checkout_value", value.toString());
    localStorage.setItem("adbroll_checkout_plan", planName || "");
    localStorage.setItem("adbroll_checkout_event_id", eventId);
  }
  
  // Server-side with deduplication
  sendServerEvent([{
    event_name: "InitiateCheckout",
    event_id: eventId,
    custom_data: {
      value: value,
      currency: currency,
      content_name: planName,
    },
  }]);
};

export const trackPurchase = (value: number, currency: string = "USD", transactionId?: string, email?: string, planName?: string) => {
  const eventId = generateEventId();
  
  trackFBEvent("Purchase", {
    value: value,
    currency: currency,
    content_name: planName,
  }, eventId);
  trackGAEvent("purchase", {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    item_name: planName,
  });
  
  // Server-side with deduplication (with optional email for better matching)
  sendServerEvent([{
    event_name: "Purchase",
    event_id: eventId,
    user_data: email ? { email } : undefined,
    custom_data: {
      value: value,
      currency: currency,
      content_name: planName,
    },
  }]);
  
  // Clear checkout data
  if (typeof window !== "undefined") {
    localStorage.removeItem("adbroll_checkout_value");
    localStorage.removeItem("adbroll_checkout_plan");
    localStorage.removeItem("adbroll_checkout_event_id");
  }
};

export const trackLead = (source: string, email?: string) => {
  const eventId = generateEventId();
  
  trackFBEvent("Lead", {
    content_name: source,
  }, eventId);
  trackGAEvent("generate_lead", {
    source: source,
  });
  
  // Server-side with deduplication
  sendServerEvent([{
    event_name: "Lead",
    event_id: eventId,
    user_data: email ? { email } : undefined,
    custom_data: {
      content_name: source,
    },
  }]);
};

export const trackSignUp = (method: string = "email", email?: string) => {
  const eventId = generateEventId();
  
  trackFBEvent("CompleteRegistration", {
    content_name: method,
  }, eventId);
  trackGAEvent("sign_up", {
    method: method,
  });
  
  // Server-side with deduplication
  sendServerEvent([{
    event_name: "CompleteRegistration",
    event_id: eventId,
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
  const eventId = generateEventId();
  
  trackFBEvent("Subscribe", {
    value: value,
    currency: currency,
    predicted_ltv: value * 12,
    content_name: planName,
  }, eventId);
  trackGAEvent("subscribe", {
    plan: planName,
    value: value,
    currency: currency,
  });
  
  // Server-side with deduplication
  sendServerEvent([{
    event_name: "Subscribe",
    event_id: eventId,
    user_data: email ? { email } : undefined,
    custom_data: {
      content_name: planName,
      value: value,
      currency: currency,
    },
  }]);
};
