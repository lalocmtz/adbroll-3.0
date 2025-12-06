import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  Gift,
  ChevronLeft,
  Star,
} from "lucide-react";
import { PLANS, PlanType } from "@/hooks/useReferralCode";

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

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(
    searchParams.get("ref")
  );
  const [referralValid, setReferralValid] = useState(false);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Check for referral code in URL or profile
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
        // Check if user has referral code in profile
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
      description:
        language === "es"
          ? "Perfecto para explorar la plataforma"
          : "Perfect for exploring the platform",
      icon: <Zap className="h-6 w-6" />,
      features: [
        {
          text: language === "es" ? "Vista limitada de videos" : "Limited video access",
          included: true,
        },
        {
          text:
            language === "es"
              ? "Vista limitada de oportunidades"
              : "Limited opportunities access",
          included: true,
        },
        {
          text:
            language === "es" ? "1 extracción de guión por día" : "1 script extraction per day",
          included: true,
        },
        {
          text: language === "es" ? "Variantes IA" : "AI Variants",
          included: false,
        },
        {
          text: language === "es" ? "Análisis IA" : "AI Analysis",
          included: false,
        },
        {
          text: language === "es" ? "Panel de afiliados" : "Affiliate dashboard",
          included: false,
        },
      ],
    },
    {
      type: "creator",
      name: "Creator",
      price: 29,
      description:
        language === "es"
          ? "Para creadores que quieren escalar"
          : "For creators who want to scale",
      icon: <Sparkles className="h-6 w-6" />,
      highlighted: true,
      badge: language === "es" ? "Más popular" : "Most popular",
      features: [
        {
          text: language === "es" ? "Acceso completo a videos" : "Full video access",
          included: true,
        },
        {
          text: language === "es" ? "Acceso completo a productos" : "Full product access",
          included: true,
        },
        {
          text: language === "es" ? "Análisis IA ilimitado" : "Unlimited AI analysis",
          included: true,
        },
        {
          text:
            language === "es"
              ? "Variantes IA (hasta 10 por análisis)"
              : "AI Variants (up to 10 per analysis)",
          included: true,
        },
        {
          text:
            language === "es"
              ? "Herramientas ilimitadas"
              : "Unlimited tools (generator, extractor)",
          included: true,
        },
        {
          text: language === "es" ? "Panel de afiliados" : "Affiliate dashboard",
          included: true,
        },
      ],
    },
    {
      type: "studio",
      name: "Studio",
      price: 49,
      description:
        language === "es"
          ? "Para equipos y agencias profesionales"
          : "For professional teams and agencies",
      icon: <Building2 className="h-6 w-6" />,
      badge: language === "es" ? "Más completo" : "Most complete",
      features: [
        {
          text: language === "es" ? "Todo lo del plan Creator" : "Everything in Creator",
          included: true,
        },
        {
          text: language === "es" ? "Variantes IA avanzadas" : "Advanced AI Variants",
          included: true,
        },
        {
          text:
            language === "es" ? "Priorización en análisis" : "Priority in analysis queue",
          included: true,
        },
        {
          text: language === "es" ? "Soporte premium" : "Premium support",
          included: true,
        },
        {
          text: language === "es" ? "Preparado para agencias" : "Agency-ready features",
          included: true,
        },
        {
          text:
            language === "es" ? "Reportes y métricas avanzadas" : "Advanced reports & metrics",
          included: true,
        },
      ],
    },
  ];

  const faqItems = [
    {
      question:
        language === "es"
          ? "¿Puedo cancelar en cualquier momento?"
          : "Can I cancel anytime?",
      answer:
        language === "es"
          ? "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración. No hay contratos ni compromisos a largo plazo."
          : "Yes, you can cancel your subscription at any time from your settings panel. There are no contracts or long-term commitments.",
    },
    {
      question:
        language === "es"
          ? "¿Qué incluye la prueba con descuento?"
          : "What's included in the discounted trial?",
      answer:
        language === "es"
          ? "El descuento del 50% aplica solo al primer mes de tu suscripción. Después de ese mes, se cobrará el precio regular del plan que elegiste."
          : "The 50% discount applies only to the first month of your subscription. After that month, you'll be charged the regular price of your chosen plan.",
    },
    {
      question:
        language === "es"
          ? "¿Puedo ganar dinero recomendando Adbroll?"
          : "Can I earn money recommending Adbroll?",
      answer:
        language === "es"
          ? "¡Absolutamente! Con nuestro programa de afiliados, ganas el 30% de comisión recurrente por cada usuario que se suscriba con tu código. Puedes crear tu código desde el panel de configuración."
          : "Absolutely! With our affiliate program, you earn 30% recurring commission for every user who subscribes with your code. You can create your code from the settings panel.",
    },
    {
      question:
        language === "es" ? "¿Qué pasa si cambio de plan?" : "What happens if I change plans?",
      answer:
        language === "es"
          ? "Puedes subir o bajar de plan en cualquier momento. Si subes, el cambio es inmediato y se prorratea. Si bajas, el cambio aplica al siguiente ciclo de facturación."
          : "You can upgrade or downgrade your plan at any time. If you upgrade, the change is immediate and prorated. If you downgrade, the change applies to the next billing cycle.",
    },
  ];

  const handleSelectPlan = (planType: PlanType) => {
    const refParam = referralCode ? `&ref=${referralCode}` : "";

    if (planType === "free") {
      navigate("/register" + (referralCode ? `?ref=${referralCode}` : ""));
      return;
    }

    if (session) {
      // User is logged in - go to checkout (placeholder for now)
      navigate(`/checkout?plan=${planType}${refParam}`);
    } else {
      // User not logged in - go to register with redirect
      navigate(
        `/register?redirect=/checkout?plan=${planType}${refParam}${
          referralCode ? `&ref=${referralCode}` : ""
        }`
      );
    }
  };

  const getDiscountedPrice = (originalPrice: number) => {
    if (referralValid && originalPrice > 0) {
      return originalPrice * 0.5;
    }
    return originalPrice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Link to="/" className="text-2xl font-bold hover:text-primary transition-colors">
              adbroll
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Button variant="outline" onClick={() => navigate("/app")}>
                {language === "es" ? "Ir al Dashboard" : "Go to Dashboard"}
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  {language === "es" ? "Iniciar sesión" : "Sign in"}
                </Button>
                <Button onClick={() => navigate("/register")}>
                  {language === "es" ? "Registrarse" : "Sign up"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Referral Banner */}
        {referralValid && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-center gap-3">
            <Gift className="h-5 w-5 text-green-600" />
            <p className="text-green-800 font-medium">
              {language === "es"
                ? "Descuento aplicado gracias al creador — tu primer mes cuesta la mitad 🎉"
                : "Discount applied thanks to the creator — your first month costs half 🎉"}
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === "es"
              ? "Elige el plan perfecto para ti"
              : "Choose the perfect plan for you"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "es"
              ? "Accede a los scripts más rentables de TikTok Shop y multiplica tus ventas"
              : "Access the most profitable TikTok Shop scripts and multiply your sales"}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => {
            const discountedPrice = getDiscountedPrice(plan.price);
            const hasDiscount = referralValid && plan.price > 0;

            return (
              <Card
                key={plan.type}
                className={`relative p-6 flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-primary shadow-xl shadow-primary/10 scale-105"
                    : "border-border"
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
                          ? language === "es"
                            ? "Gratis"
                            : "Free"
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
                      <span
                        className={
                          feature.included ? "text-foreground" : "text-muted-foreground/50"
                        }
                      >
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
                    ? language === "es"
                      ? "Comenzar gratis"
                      : "Start free"
                    : plan.type === "creator"
                    ? language === "es"
                      ? "Elegir Plan Creator"
                      : "Choose Creator Plan"
                    : language === "es"
                    ? "Seleccionar Plan Studio"
                    : "Select Studio Plan"}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            {language === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            {language === "es"
              ? "¿Tienes preguntas? Estamos aquí para ayudarte."
              : "Have questions? We're here to help."}
          </p>
          <Button variant="outline" onClick={() => navigate("/support")}>
            {language === "es" ? "Contactar soporte" : "Contact support"}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Adbroll. {language === "es" ? "Todos los derechos reservados." : "All rights reserved."}
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                {language === "es" ? "Privacidad" : "Privacy"}
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                {language === "es" ? "Términos" : "Terms"}
              </Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
