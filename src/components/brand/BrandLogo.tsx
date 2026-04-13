import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** "light" for dark backgrounds (default), "dark" for light backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  /** Hides the wordmark, keeps only the mark glyph. */
  iconOnly?: boolean;
}

/**
 * adbroll wordmark. The mark is a lowercase "a" rendered in the brand
 * pink; the rest of the wordmark follows the tone of the surface so the
 * same component works on the landing ink hero, the /app blue header,
 * and the white auth shell without overrides.
 */
export const BrandLogo = ({
  tone = "light",
  className,
  iconOnly = false,
}: BrandLogoProps) => {
  const wordTone = tone === "light" ? "text-brand-mist" : "text-brand-ink";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-display font-extrabold tracking-tight",
        className,
      )}
      aria-label="adbroll"
    >
      <span
        aria-hidden
        className="inline-flex size-8 items-center justify-center rounded-button bg-gradient-brand text-white shadow-brand-glow-pink"
      >
        <span className="relative -top-[1px] text-lg leading-none">a</span>
      </span>
      {!iconOnly && (
        <span className={cn("text-xl leading-none", wordTone)}>
          adbroll
        </span>
      )}
    </span>
  );
};
