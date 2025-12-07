import { ReactNode, useState } from "react";
import { useBlurGate } from "@/hooks/useBlurGate";
import { PaywallModal } from "./PaywallModal";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlurOverlayProps {
  children: ReactNode;
  feature?: string;
  className?: string;
  showLockIcon?: boolean;
  intensity?: "full" | "partial" | "light";
}

export const BlurOverlay = ({ 
  children, 
  feature, 
  className,
  showLockIcon = true,
  intensity = "full"
}: BlurOverlayProps) => {
  const { shouldBlur, shouldBlurPartial, hasPaid } = useBlurGate();
  const [showPaywall, setShowPaywall] = useState(false);

  // If paid, show content normally
  if (hasPaid) {
    return <>{children}</>;
  }

  const needsBlur = shouldBlur || (shouldBlurPartial && intensity !== "light");
  
  const blurAmount = shouldBlur 
    ? intensity === "full" ? "blur-md" : "blur-sm"
    : shouldBlurPartial 
      ? intensity === "partial" ? "blur-sm" : "blur-[2px]"
      : "";

  return (
    <>
      <div 
        className={cn("relative cursor-pointer group", className)}
        onClick={() => setShowPaywall(true)}
      >
        <div className={cn(
          "transition-all duration-200 select-none pointer-events-none",
          needsBlur && blurAmount
        )}>
          {children}
        </div>
        
        {needsBlur && showLockIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border shadow-sm text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Click para desbloquear</span>
            </div>
          </div>
        )}
      </div>
      
      <PaywallModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        feature={feature}
      />
    </>
  );
};

export const LockedValue = ({ value, placeholder = "•••" }: { value: string | number; placeholder?: string }) => {
  const { hasPaid } = useBlurGate();
  
  if (hasPaid) return <>{value}</>;
  
  return (
    <span className="text-muted-foreground select-none">
      {placeholder}
    </span>
  );
};

export default BlurOverlay;