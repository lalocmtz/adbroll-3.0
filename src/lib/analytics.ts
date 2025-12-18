// Analytics utility for Facebook Pixel and Google Analytics

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Facebook Pixel Events
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

// Combined tracking functions for common events
export const trackPageView = (pageName: string) => {
  trackFBEvent("PageView");
  trackGAEvent("page_view", { page_title: pageName });
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
};

export const trackPurchase = (value: number, currency: string = "USD", transactionId?: string) => {
  trackFBEvent("Purchase", {
    value: value,
    currency: currency,
  });
  trackGAEvent("purchase", {
    transaction_id: transactionId,
    value: value,
    currency: currency,
  });
};

export const trackLead = (source: string) => {
  trackFBEvent("Lead", {
    content_name: source,
  });
  trackGAEvent("generate_lead", {
    source: source,
  });
};

export const trackSignUp = (method: string = "email") => {
  trackFBEvent("CompleteRegistration", {
    content_name: method,
  });
  trackGAEvent("sign_up", {
    method: method,
  });
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
