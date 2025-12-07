import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Market = "mx" | "us";

interface MarketContextType {
  market: Market;
  setMarket: (market: Market) => void;
  marketLabel: string;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const STORAGE_KEY = "adbroll_market";

export const MarketProvider = ({ children }: { children: ReactNode }) => {
  const [market, setMarketState] = useState<Market>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "mx" || stored === "us") {
      return stored;
    }
    
    // Default based on browser language
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith("es") ? "mx" : "us";
  });

  const setMarket = (newMarket: Market) => {
    setMarketState(newMarket);
    localStorage.setItem(STORAGE_KEY, newMarket);
  };

  const marketLabel = market === "mx" ? "México" : "Estados Unidos";

  return (
    <MarketContext.Provider value={{ market, setMarket, marketLabel }}>
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
