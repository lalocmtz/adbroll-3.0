/**
 * Geo-detection utility for automatic market/language selection
 * Uses ipapi.co free tier (1,000 requests/day)
 */

export type DetectedCountry = "mx" | "us" | null;

const GEO_CACHE_KEY = "adbroll_geo_detected";

export const detectCountryByIP = async (): Promise<DetectedCountry> => {
  try {
    // Check if we already detected (avoid multiple API calls)
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached === "mx" || cached === "us") {
      return cached;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();

    let result: DetectedCountry = null;

    // Only return if it's MX or US (supported markets)
    if (countryCode === "MX") {
      result = "mx";
    } else if (countryCode === "US") {
      result = "us";
    }

    // Cache result in session to avoid repeated API calls
    if (result) {
      sessionStorage.setItem(GEO_CACHE_KEY, result);
    }

    return result;
  } catch (error) {
    console.warn("Geo detection failed, using browser language fallback");
    return null;
  }
};

/**
 * Fallback: detect market from browser language
 */
export const detectMarketFromBrowser = (): "mx" | "us" => {
  const browserLang = navigator.language.toLowerCase();
  // Spanish variants -> Mexico market
  if (browserLang.startsWith("es")) {
    return "mx";
  }
  // Default to US for English and other languages
  return "us";
};
