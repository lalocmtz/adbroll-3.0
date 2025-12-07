import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Sparkles,
  Gift,
  Star,
} from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PricingModal = ({ open, onOpenChange }: PricingModalProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState(false);

  useEffect(() => {
    if (!open) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const checkReferral = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("referral_code_used")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.referral_code_used) {
          setReferralCode(profile.referral_code_used);
          setReferralValid(true);
        }
      }
    };
    checkReferral();
  }, [open]);

  const features = language === "es" 
    ? [
        "Acceso completo a TikTok Shop México y USA",
        "Scripts reales + extractor automático",
        "Variantes IA ilimitadas",
        "Hooks generados por IA",
        "Panel de afiliados (30% recurrente)",
      ]
    : [
        "Full access to TikTok Shop Mexico and US",
        "Real scripts + automatic extractor",
        "Unlimited AI variants",
        "AI-generated hooks",
        "Affiliate panel (30% recurring)",
      ];

  const handleSelectPlan = () => {
    onOpenChange(false);
    const refParam = referralCode ? `&ref=${referralCode}` : "";

    if (session) {
      navigate(`/checkout?plan=creator${refParam}`);
    } else {
      navigate(`/register?redirect=/checkout?plan=creator${refParam}${referralCode ? `&ref=${referralCode}` : ""}`);
    }
  };

  const price = 29;
  const discountedPrice = referralValid ? price * 0.5 : price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            Adbroll Pro
          </DialogTitle>
        </DialogHeader>

        {referralValid && (
          <div className="mb-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center justify-center gap-2">
            <Gift className="h-4 w-4 text-green-600" />
            <p className="text-green-800 dark:text-green-300 font-medium text-sm">
              {language === "es"
                ? "¡Descuento aplicado! Tu primer mes cuesta la mitad 🎉"
                : "Discount applied! Your first month costs half 🎉"}
            </p>
          </div>
        )}

        <Card className="relative p-6 border-2 border-primary">
          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-primary text-primary-foreground">
            <Star className="h-3 w-3 mr-1" />
            {language === "es" ? "Plan único" : "Single plan"}
          </Badge>

          <div className="text-center mb-4 pt-2">
            <div className="inline-flex p-2 rounded-lg mb-2 bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {language === "es"
                ? "Todo lo que necesitas para vender más"
                : "Everything you need to sell more"}
            </p>

            <div className="flex items-baseline justify-center gap-1">
              {referralValid ? (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${price}
                  </span>
                  <span className="text-3xl font-bold text-primary">
                    ${discountedPrice.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold">${price}</span>
              )}
              <span className="text-muted-foreground text-sm">
                /{language === "es" ? "mes" : "month"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              ~$499 MXN/{language === "es" ? "mes" : "month"}
            </p>

            {referralValid && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                🎉 50% off {language === "es" ? "primer mes" : "first month"}
              </p>
            )}
          </div>

          <ul className="space-y-2 mb-4 text-sm">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSelectPlan}
          >
            {language === "es" ? "Empieza ahora" : "Start now"}
          </Button>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
