import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const LandingPricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(
    searchParams.get("ref")
  );
  const [referralValid, setReferralValid] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const checkReferral = async () => {
      const urlRef = searchParams.get("ref");
      if (urlRef) {
        const { data } = await supabase
          .from("affiliate_codes")
          .select("id")
          .eq("code", urlRef.toUpperCase())
          .maybeSingle();
        if (data) {
          setReferralCode(urlRef.toUpperCase());
          setReferralValid(true);
        }
      } else {
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
      }
    };
    checkReferral();
  }, [searchParams]);

  const plans: Plan[] = [
    {
      type: "free",
      name: "Free",
      price: 0,
      description: language === "es" ? "Perfecto para explorar" : "Perfect for exploring",
      icon: <Zap className="h-6 w-6" />,
      features: [
        { text: language === "es" ? "Vista limitada de videos" : "Limited video access", included: true },
        { text: language === "es" ? "Vista limitada de oportunidades" : "Limited opportunities", included: true },
        { text: language === "es" ? "1 extracción por día" : "1 extraction/day", included: true },
        { text: language === "es" ? "Variantes IA" : "AI Variants", included: false },
        { text: language === "es" ? "Análisis IA" : "AI Analysis", included: false },
      ],
    },
    {
      type: "creator",
      name: "Creator",
      price: 29,
      description: language === "es" ? "Para creadores que escalan" : "For scaling creators",
      icon: <Sparkles className="h-6 w-6" />,
      highlighted: true,
      badge: language === "es" ? "Más popular" : "Most popular",
      features: [
        { text: language === "es" ? "Acceso completo a videos" : "Full video access", included: true },
        { text: language === "es" ? "Acceso completo a productos" : "Full product access", included: true },
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
      icon: <Building2 className="h-6 w-6" />,
      badge: language === "es" ? "Más completo" : "Most complete",
      features: [
        { text: language === "es" ? "Todo lo del plan Creator" : "Everything in Creator", included: true },
        { text: language === "es" ? "Variantes IA avanzadas" : "Advanced AI Variants", included: true },
        { text: language === "es" ? "Priorización en análisis" : "Priority analysis", included: true },
        { text: language === "es" ? "Soporte premium" : "Premium support", included: true },
        { text: language === "es" ? "Preparado para agencias" : "Agency-ready", included: true },
      ],
    },
  ];

  const handleSelectPlan = (planType: PlanType) => {
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
    <section id="pricing" className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-6xl mx-auto">
        {/* Referral Banner */}
        {referralValid && (
          <div className="mb-8 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-center gap-3 max-w-3xl mx-auto">
            <Gift className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-300 font-medium">
              {language === "es"
                ? "Descuento aplicado: Primer mes a mitad de precio 🎉"
                : "Discount applied: First month half price 🎉"}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === "es" ? "Planes y Precios" : "Plans & Pricing"}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === "es"
              ? "Elige el plan perfecto para tu nivel de creación"
              : "Choose the perfect plan for your creation level"}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const discountedPrice = getDiscountedPrice(plan.price);
            const hasDiscount = referralValid && plan.price > 0;

            return (
              <Card
                key={plan.type}
                className={`relative p-6 flex flex-col transition-all duration-300 hover:shadow-lg ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-xl shadow-primary/10 md:scale-105"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {plan.badge && (
                  <Badge
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`inline-flex p-3 rounded-xl mb-4 ${
                      plan.highlighted
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  <div className="flex items-baseline justify-center gap-2">
                    {hasDiscount ? (
                      <>
                        <span className="text-2xl text-muted-foreground line-through">
                          ${plan.price}
                        </span>
                        <span className="text-4xl font-bold text-primary">
                          ${discountedPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold">
                        {plan.price === 0
                          ? language === "es" ? "Gratis" : "Free"
                          : `$${plan.price}`}
                      </span>
                    )}
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">
                        /{language === "es" ? "mes" : "mo"}
                      </span>
                    )}
                  </div>

                  {hasDiscount && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      🎉 {language === "es" ? "50% off primer mes" : "50% off first month"}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
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
                  size="lg"
                  onClick={() => handleSelectPlan(plan.type)}
                >
                  {plan.price === 0
                    ? language === "es" ? "Comenzar gratis" : "Start free"
                    : plan.type === "creator"
                    ? language === "es" ? "Elegir Creator" : "Choose Creator"
                    : language === "es" ? "Seleccionar Studio" : "Select Studio"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingPricing;
