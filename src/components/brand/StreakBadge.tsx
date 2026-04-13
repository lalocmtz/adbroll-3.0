import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  days: number;
  label?: string;
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
}

export const StreakBadge = ({
  days,
  label = "días seguidos",
  className,
  tone = "light",
  compact = false,
}: StreakBadgeProps) => {
  if (days < 1) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1",
        "font-mono tabular-nums",
        tone === "dark"
          ? "border-white/15 bg-white/5 text-brand-mist"
          : "border-brand-pink/25 bg-brand-pink/10 text-brand-pink",
        compact ? "text-[11px]" : "text-xs",
        className,
      )}
      aria-label={`Racha de ${days} ${label}`}
    >
      <Flame
        className={cn(
          compact ? "h-3 w-3" : "h-3.5 w-3.5",
          "animate-pulse-glow-pink motion-reduce:animate-none",
        )}
      />
      <span className="font-semibold">{days}</span>
      {!compact && (
        <span className="font-normal opacity-80 uppercase tracking-wide text-[10px]">
          {label}
        </span>
      )}
    </div>
  );
};

export default StreakBadge;
