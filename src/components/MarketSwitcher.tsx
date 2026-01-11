import { useMarket, Market } from "@/contexts/MarketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MarketSwitcherProps {
  variant?: "tabs" | "compact";
  className?: string;
}

export const MarketSwitcher = ({ variant = "tabs", className }: MarketSwitcherProps) => {
  const { market, setMarket } = useMarket();
  const { syncWithMarket } = useLanguage();

  const handleMarketChange = (newMarket: Market) => {
    setMarket(newMarket);
    // Auto-sync language and currency based on market
    syncWithMarket(newMarket);
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => handleMarketChange(market === "mx" ? "us" : "mx")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
          "bg-muted/60 hover:bg-muted border border-border/50",
          className
        )}
      >
        <span className="text-base">{market === "mx" ? "🇲🇽" : "🇺🇸"}</span>
        <span className="text-foreground/80">{market === "mx" ? "MX" : "US"}</span>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50", className)}>
      <button
        onClick={() => handleMarketChange("mx")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
          market === "mx"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <span className="text-base">🇲🇽</span>
        <span>México</span>
      </button>
      <button
        onClick={() => handleMarketChange("us")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
          market === "us"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <span className="text-base">🇺🇸</span>
        <span>USA</span>
      </button>
    </div>
  );
};

export default MarketSwitcher;
