import { createContext, useContext, ReactNode, useEffect } from "react";
export type Market = "mx" | "us";
interface MarketContextType { market: Market; setMarket: (market: Market) => void; marketLabel: string; marketCountry: string; isGeoLoading: boolean; geoDetected: boolean; }
const MarketContext = createContext<MarketContextType | undefined>(undefined);
// Mexico-only launch. US records are retained for the later launch.
export const MarketProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => { try { localStorage.setItem("adbroll_market", "mx"); } catch { /* private browser */ } }, []);
  return <MarketContext.Provider value={{ market: "mx", setMarket: () => {}, marketLabel: "México", marketCountry: "MX", isGeoLoading: false, geoDetected: false }}>{children}</MarketContext.Provider>;
};
export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used within a MarketProvider");
  return context;
};
