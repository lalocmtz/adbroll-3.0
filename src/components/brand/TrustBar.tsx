import { cn } from "@/lib/utils";

interface TrustStat {
  /** Big number or short phrase, e.g. "$847K" or "20 / día". */
  value: string;
  /** Caption below the number, e.g. "GMV rastreado hoy". */
  label: string;
}

interface TrustBarProps {
  stats: TrustStat[];
  /** "light" = ink background (hero), "dark" = mist background (body). */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Compact proof strip for landing sections. Renders a responsive grid of
 * 3–4 big "proof numbers" with a short caption. Uses font-mono so the
 * numbers lock horizontally on any viewport.
 */
export const TrustBar = ({ stats, tone = "dark", className }: TrustBarProps) => {
  const wrapperTone =
    tone === "light"
      ? "text-brand-mist"
      : "text-brand-ink";
  const captionTone =
    tone === "light"
      ? "text-brand-mist/60"
      : "text-brand-ink/60";

  return (
    <div
      className={cn(
        "grid gap-6 sm:gap-8",
        stats.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
        wrapperTone,
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1">
          <span className="font-mono tabular-nums text-money-lg font-bold">
            {stat.value}
          </span>
          <span
            className={cn(
              "text-micro uppercase tracking-[0.08em]",
              captionTone,
            )}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};
