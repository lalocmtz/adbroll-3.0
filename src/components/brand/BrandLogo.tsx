import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** "light" for dark backgrounds (default), "dark" for light backgrounds. */
  tone?: "light" | "dark";
  className?: string;
  /**
   * Optional size of the wordmark text. Defaults to "md" (text-xl).
   * Use "sm" for compact headers/footers, "lg" for auth screens.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Kept for backwards compatibility. With the generic text wordmark there is
   * no separate glyph, so this renders just the "T" mark when true.
   */
  iconOnly?: boolean;
}

const SIZES: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * TokXray text wordmark — generic, clean, no logo image.
 *
 * "Tok" follows the surface tone (mist on dark, ink on light) and "Xray"
 * is rendered in the brand pink accent so the X reads as the mark. The same
 * component works on the landing ink hero, the /app header, the white auth
 * shell, footers and the sidebar.
 */
export const BrandLogo = ({
  tone = "light",
  className,
  size = "md",
  iconOnly = false,
}: BrandLogoProps) => {
  const baseTone = tone === "light" ? "text-brand-mist" : "text-brand-ink";

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-extrabold tracking-tight leading-none",
        SIZES[size],
        baseTone,
        className,
      )}
      aria-label="TokXray"
    >
      {iconOnly ? (
        <span className="text-brand-pink">X</span>
      ) : (
        <>
          <span>Tok</span>
          <span className="text-brand-pink">Xray</span>
        </>
      )}
    </span>
  );
};
