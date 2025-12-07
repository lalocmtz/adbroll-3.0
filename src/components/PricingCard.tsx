import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useLanguage } from "@/contexts/LanguageContext";

interface PricingCardProps {
  features: string[];
  highlighted?: boolean;
  onSelect?: () => void;
}

export const PricingCard = ({
  features,
  highlighted = true,
  onSelect,
}: PricingCardProps) => {
  const { language } = useLanguage();
  const { referralCodeUsed, referralDiscount } = useReferralCode();
  
  const price = 29;
  const hasDiscount = referralCodeUsed && !referralDiscount?.discount_applied;
  const discountedPrice = hasDiscount ? price * 0.5 : price;

  return (
    <Card
      className={`p-6 relative ${
        highlighted
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-border"
      }`}
    >
      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
        {language === "es" ? "Plan único" : "Single plan"}
      </Badge>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">Adbroll Pro</h3>
        <div className="flex items-center justify-center gap-2">
          {hasDiscount ? (
            <>
              <span className="text-2xl text-muted-foreground line-through">
                ${price}
              </span>
              <span className="text-4xl font-bold text-primary">
                ${discountedPrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-4xl font-bold">${price}</span>
          )}
          <span className="text-muted-foreground">
            /{language === "es" ? "mes" : "mo"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          ~$499 MXN/{language === "es" ? "mes" : "mo"}
        </p>
        {hasDiscount && (
          <p className="text-sm text-green-600 mt-2 font-medium">
            🎉 {language === "es" ? "50% off primer mes" : "50% off first month"}
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant="default"
        onClick={onSelect}
      >
        {language === "es" ? "Empieza ahora" : "Start now"}
      </Button>
    </Card>
  );
};

export const ReferralDiscountBanner = () => {
  const { language } = useLanguage();
  const { referralCodeUsed, referralDiscount } = useReferralCode();

  if (!referralCodeUsed || referralDiscount?.discount_applied) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <p className="text-green-800 font-medium flex items-center gap-2">
        🎉{" "}
        {language === "es"
          ? "Descuento aplicado: primer mes a mitad de precio"
          : "Discount applied: first month at half price"}
      </p>
      <p className="text-green-600 text-sm mt-1">
        {language === "es"
          ? `Código usado: ${referralCodeUsed}`
          : `Code used: ${referralCodeUsed}`}
      </p>
    </div>
  );
};
