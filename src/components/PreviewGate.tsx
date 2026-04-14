import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { cn } from "@/lib/utils";

interface PreviewGateProps {
  locked: boolean;
  feature: string;
  children: ReactNode;
  className?: string;
  radiusClass?: string;
  blurAmount?: "sm" | "md";
}

// Unified "visible but gated" overlay used by Dashboard, Products, Creators.
// Mirrors the thedailyvirals.com pattern: show the content, blur it, on click
// open the in-page paywall modal instead of navigating to /unlock.
export const PreviewGate = ({
  locked,
  feature,
  children,
  className,
  radiusClass = "rounded-2xl md:rounded-[20px]",
  blurAmount = "md",
}: PreviewGateProps) => {
  const { openPaywall } = useBlurGateContext();

  if (!locked) return <>{children}</>;

  // Responsive blur: lighter on mobile so locked content stays
  // recognizable (it's small already), stronger on desktop where the
  // card is bigger and a stronger blur reads as intentional gating.
  const blurClass =
    blurAmount === "sm"
      ? "blur-[1px] md:blur-[2px]"
      : "blur-[2px] md:blur-[6px]";

  return (
    <div
      className={cn("relative cursor-pointer group", className)}
      onClick={() => openPaywall(feature)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPaywall(feature);
        }
      }}
      aria-label="Desbloquear contenido"
    >
      <div className={cn(blurClass, "pointer-events-none")}>{children}</div>
      <div
        className={cn(
          "absolute inset-0 bg-background/30 flex items-center justify-center",
          radiusClass,
        )}
      >
        <div className="text-center p-3 md:p-4">
          <Lock className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1.5 md:mb-2 text-muted-foreground" />
          <p className="text-xs md:text-sm font-medium text-foreground">
            Desbloquear
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreviewGate;
