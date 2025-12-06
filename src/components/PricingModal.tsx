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
  X,
  Sparkles,
  Zap,
  Building2,
  Gift,
  Star,
} from "lucide-react";
import { PlanType } from "@/hooks/useReferralCode";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  type: PlanType;
  name: string;
  price: number;
  description: string;
  icon: React.ReactNode;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
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

  const plans: Plan[] = [
    {
      type: "free",
      name: "Free",
      price: 0,
      description: language === "es" ? "Explorar la plataforma" : "Explore the platform",
      icon: <Zap className="h-5 w-5" />,
      features: [
        { text: language === "es" ? "Vista limitada de videos" : "Limited video access", included: true },
        { text: language === "es" ? "1 extracción por día" : "1 extraction per day", included: true },
        { text: language === "es" ? "Variantes IA" : "AI Variants", included: false },
        { text: language === "es" ? "Análisis IA" : "AI Analysis", included: false },
      ],
    },
    {
      type: "creator",
      name: "Creator",
      price: 29,
      description: language === "es" ? "Para creadores que escalan" : "For scaling creators",
      icon: <Sparkles className="h-5 w-5" />,
      highlighted: true,
      badge: language === "es" ? "Popular" : "Popular",
      features: [
        { text: language === "es" ? "Acceso completo" : "Full access", included: true },
        { text: language === "es" ? "Análisis IA ilimitado" : "Unlimited AI analysis", included: true },
        { text: language === "es" ? "Variantes IA (10/análisis)" : "AI Variants (10/analysis)", included: true },
        { text: language === "es" ? "Panel de afiliados" : "Affiliate dashboard", included: true },
      ],
    },
    {
      type: "studio",
      name: "Studio",
      price: 49,
      description: language === "es" ? "Para equipos y agencias" : "For teams & agencies",
      icon: <Building2 className="h-5 w-5" />,
      badge: language === "es" ? "Completo" : "Complete",
      features: [
        { text: language === "es" ? "Todo de Creator" : "Everything in Creator", included: true },
        { text: language === "es" ? "Variantes avanzadas" : "Advanced variants", included: true },
        { text: language === "es" ? "Soporte premium" : "Premium support", included: true },
        { text: language === "es" ? "Para agencias" : "Agency-ready", included: true },
      ],
    },
  ];

  const handleSelectPlan = (planType: PlanType) => {
    onOpenChange(false);
    const refParam = referralCode ? `&ref=${referralCode}` : "";

    if (planType === "free") {
      navigate("/register" + (referralCode ? `?ref=${referralCode}` : ""));
      return;
    }

    if (session) {
      navigate(`/checkout?plan=${planType}${refParam}`);
    } else {
      navigate(`/register?redirect=/checkout?plan=${planType}${refParam}${referralCode ? `&ref=${referralCode}` : ""}`);
    }
  };

  const getDiscountedPrice = (originalPrice: number) => {
    if (referralValid && originalPrice > 0) {
      return originalPrice * 0.5;
    }
    return originalPrice;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {language === "es" ? "Elige tu plan" : "Choose your plan"}
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

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => {
            const discountedPrice = getDiscountedPrice(plan.price);
            const hasDiscount = referralValid && plan.price > 0;

            return (
              <Card
                key={plan.type}
                className={`relative p-4 flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
              >
                {plan.badge && (
                  <Badge
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-4 pt-2">
                  <div
                    className={`inline-flex p-2 rounded-lg mb-2 ${
                      plan.highlighted
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>

                  <div className="flex items-baseline justify-center gap-1">
                    {hasDiscount ? (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          ${plan.price}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          ${discountedPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">
                        {plan.price === 0
                          ? language === "es" ? "Gratis" : "Free"
                          : `$${plan.price}`}
                      </span>
                    )}
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-sm">/mes</span>
                    )}
                  </div>

                  {hasDiscount && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      🎉 50% off primer mes
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-4 flex-grow text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground/50"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectPlan(plan.type)}
                >
                  {plan.price === 0
                    ? language === "es" ? "Comenzar gratis" : "Start free"
                    : language === "es" ? "Elegir plan" : "Choose plan"}
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
