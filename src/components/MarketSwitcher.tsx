import { cn } from "@/lib/utils";
interface MarketSwitcherProps { variant?: "tabs" | "compact"; className?: string }
export const MarketSwitcher = ({ variant = "tabs", className }: MarketSwitcherProps) => (
  <div className={cn("flex items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 text-xs font-medium", className)}>
    <span aria-hidden="true">🇲🇽</span><span>{variant === "compact" ? "MX" : "TikTok Shop México"}</span>
  </div>
);
export default MarketSwitcher;
