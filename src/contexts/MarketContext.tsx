import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { detectCountryByIP, detectMarketFromBrowser } from "@/lib/geoDetection";

export type Market = "mx" | "us";

interface MarketContextType {
  market: Market;
  setMarket: (market: Market) => void;
  marketLabel: string;
  marketCountry: string; // For DB queries: 'MX' or 'US'
  isGeoLoading: boolean;
  geoDetected: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const STORAGE_KEY = "adbroll_market";
const GEO_DONE_KEY = "adbroll_geo_done";

export const MarketProvider = ({ children }: { children: ReactNode }) => {
  const [market, setMarketState] = useState<Market>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "mx" || stored === "us") {
      return stored;
    }
    // Temporary default from browser language (will be updated by geo-detection)
    return detectMarketFromBrowser();
  });

  const [isGeoLoading, setIsGeoLoading] = useState(() => {
    // Only loading if we haven't done geo-detection yet
    const stored = localStorage.getItem(STORAGE_KEY);
    const geoDone = localStorage.getItem(GEO_DONE_KEY);
    return !stored && !geoDone;
  });

  const [geoDetected, setGeoDetected] = useState(false);

  // Geo-detection on first visit
  useEffect(() => {
    const detectAndSetMarket = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const geoDone = localStorage.getItem(GEO_DONE_KEY);

      // If user already has a preference OR geo was already done, skip
      if (stored || geoDone) {
        setIsGeoLoading(false);
        return;
      }

      try {
        const detectedCountry = await detectCountryByIP();

        if (detectedCountry) {
          setMarketState(detectedCountry);
          localStorage.setItem(STORAGE_KEY, detectedCountry);
          setGeoDetected(true);
          console.log(`🌍 Geo-detected market: ${detectedCountry.toUpperCase()}`);
        } else {
          // Use browser language fallback
          const fallback = detectMarketFromBrowser();
          setMarketState(fallback);
          localStorage.setItem(STORAGE_KEY, fallback);
          console.log(`🌐 Browser fallback market: ${fallback.toUpperCase()}`);
        }
      } catch (error) {
        console.warn("Geo detection error:", error);
        const fallback = detectMarketFromBrowser();
        setMarketState(fallback);
        localStorage.setItem(STORAGE_KEY, fallback);
      }

      // Mark geo-detection as done (even if it failed)
      localStorage.setItem(GEO_DONE_KEY, "true");
      setIsGeoLoading(false);
    };

    detectAndSetMarket();
  }, []);

  const setMarket = (newMarket: Market) => {
    setMarketState(newMarket);
    localStorage.setItem(STORAGE_KEY, newMarket);
  };

  const marketLabel = market === "mx" ? "México" : "Estados Unidos";
  const marketCountry = market === "mx" ? "MX" : "US"; // Uppercase for DB queries

  return (
    <MarketContext.Provider value={{ 
      market, 
      setMarket, 
      marketLabel, 
      marketCountry,
      isGeoLoading,
      geoDetected
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error("useMarket must be used within a MarketProvider");
  }
  return context;
};
