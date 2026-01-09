import { useState } from "react";
import { Video, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoCredits } from "@/hooks/useVideoCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { CreditPacksModal } from "./CreditPacksModal";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreditsBadgeProps {
  className?: string;
  showBuyButton?: boolean;
}

export const CreditsBadge = ({ className, showBuyButton = true }: CreditsBadgeProps) => {
  const { availableCredits, loading } = useVideoCredits();
  const { hasActiveSubscription } = useSubscription();
  const { language } = useLanguage();
  const [packsModalOpen, setPacksModalOpen] = useState(false);

  // Only show for Premium users (who have access to video generation)
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 animate-pulse", className)}>
        <Video className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">...</span>
      </div>
    );
  }

  // Determine color based on credits
  const getColorClasses = () => {
    if (availableCredits === 0) {
      return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    }
    if (availableCredits <= 2) {
      return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
    }
    return "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400";
  };

  const handleClick = () => {
    if (showBuyButton && availableCredits <= 2) {
      setPacksModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!showBuyButton || availableCredits > 2}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
          getColorClasses(),
          showBuyButton && availableCredits <= 2 && "cursor-pointer hover:opacity-80",
          className
        )}
      >
        <Video className="h-4 w-4" />
        <span className="text-sm font-medium">
          {availableCredits} {language === "es" ? "créditos" : "credits"}
        </span>
        {showBuyButton && availableCredits <= 2 && (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      <CreditPacksModal 
        open={packsModalOpen} 
        onOpenChange={setPacksModalOpen} 
      />
    </>
  );
};

export default CreditsBadge;
