import { cn } from "@/lib/utils";

interface MoneyNumberProps {
  /** Raw numeric value. Formatting (locale, decimals) is controlled by props. */
  value: number;
  /** ISO currency code. Defaults to MXN since that's the money creators earn. */
  currency?: "MXN" | "USD";
  /** Show the currency symbol. Defaults to true. */
  showSymbol?: boolean;
  /** Number of fractional digits. Defaults to 0 for big headline numbers. */
  fractionDigits?: number;
  /** Visual size. Maps to fontSize tokens defined in tailwind.config.ts. */
  size?: "md" | "lg" | "xl";
  /**
   * Monospace is the default so digit width doesn't dance during count-up
   * animations. Set to false for inline body copy.
   */
  mono?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<MoneyNumberProps["size"]>, string> = {
  md: "text-money-md",
  lg: "text-money-lg",
  xl: "text-money-xl",
};

/**
 * A dedicated component for any "amount of money" on the landing / app.
 * Centralises locale formatting, monospace digit rendering, and the
 * "count-up" entry animation so real numbers always feel tactile.
 *
 * Use this instead of toLocaleString() sprinkled in components.
 */
export const MoneyNumber = ({
  value,
  currency = "MXN",
  showSymbol = true,
  fractionDigits = 0,
  size = "lg",
  mono = true,
  className,
}: MoneyNumberProps) => {
  const locale = currency === "MXN" ? "es-MX" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  return (
    <span
      className={cn(
        SIZE_CLASS[size],
        mono && "font-mono tabular-nums",
        "animate-count-up motion-reduce:animate-none",
        className,
      )}
      aria-label={`${value.toLocaleString(locale)} ${currency}`}
    >
      {formatted}
    </span>
  );
};
