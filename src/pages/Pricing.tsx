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
  Sparkles,
  Gift,
  ChevronLeft,
  Star,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(
    searchParams.get("ref")
  );
  const [referralValid, setReferralValid] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const features = language === "es" 
    ? [
        "Acceso completo a TikTok Shop México y Estados Unidos",
        "Scripts reales + extractor automático",
        "Variantes IA ilimitadas",
        "Hooks generados por IA",
        "Oportunidades de productos y creadores",
        "Favoritos, dashboard completo y analíticas",
        "Panel de afiliados (gana 30% recurrente)",
        "Soporte prioritario",
      ]
    : [
        "Full access to TikTok Shop Mexico and United States",
        "Real scripts + automatic extractor",
        "Unlimited AI variants",
        "AI-generated hooks",
        "Product and creator opportunities",
        "Favorites, full dashboard and analytics",
        "Affiliate panel (earn 30% recurring)",
        "Priority support",
      ];

  const faqItems = [
    {
      question:
        language === "es"
          ? "¿Cuánto cuesta Adbroll?"
          : "How much does Adbroll cost?",
      answer:
        language === "es"
          ? "Adbroll Pro cuesta $29 USD/mes (~$499 MXN/mes). Un solo plan con acceso completo a todas las funciones."
          : "Adbroll Pro is $29/month. One plan with full access to all features.",
    },
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
          ? "¿Funciona para México y Estados Unidos?"
          : "Does it work for Mexico and the United States?",
      answer:
        language === "es"
          ? "Sí, funciona para TikTok Shop México y Estados Unidos. Puedes cambiar de país dentro del panel."
          : "Yes, it works for TikTok Shop Mexico and US. You can switch markets inside the dashboard.",
    },
    {
      question:
        language === "es"
          ? "¿Puedo ganar dinero recomendando Adbroll?"
          : "Can I earn money recommending Adbroll?",
      answer:
        language === "es"
          ? "¡Absolutamente! Con nuestro programa de afiliados, ganas el 30% de comisión recurrente por cada usuario que se suscriba con tu código. Eso es aproximadamente $8.70 USD al mes por cada usuario activo."
          : "Absolutely! With our affiliate program, you earn 30% recurring commission for every user who subscribes with your code. That's approximately $8.70 USD per month for each active user.",
    },
  ];

  const handleSelectPlan = async () => {
    if (!session) {
      const refParam = referralCode ? `&ref=${referralCode}` : "";
      navigate(`/register?redirect=/pricing${refParam}`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: referralCode },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo iniciar el pago. Intenta de nuevo." 
          : "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const price = 29;
  const discountedPrice = referralValid ? price * 0.5 : price;

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
              Adbroll
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
              ? "Plan único Adbroll Pro"
              : "Single plan Adbroll Pro"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "es"
              ? "Acceso completo a los scripts más rentables de TikTok Shop"
              : "Full access to the most profitable TikTok Shop scripts"}
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-lg mx-auto mb-16">
          <Card className="relative p-8 border-2 border-primary shadow-xl shadow-primary/10">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              {language === "es" ? "Plan único" : "Single plan"}
            </Badge>

            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-xl mb-4 bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold mb-2">Adbroll Pro</h3>
              <p className="text-muted-foreground mb-6">
                {language === "es"
                  ? "Todo lo que necesitas para vender más en TikTok Shop"
                  : "Everything you need to sell more on TikTok Shop"}
              </p>

              <div className="flex items-baseline justify-center gap-2 mb-2">
                {referralValid ? (
                  <>
                    <span className="text-2xl text-muted-foreground line-through">
                      ${price}
                    </span>
                    <span className="text-5xl font-bold text-primary">
                      ${discountedPrice.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-5xl font-bold">${price}</span>
                )}
                <span className="text-muted-foreground text-lg">
                  /{language === "es" ? "mes" : "month"}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {language === "es" ? "~$499 MXN/mes" : "~$499 MXN/month"}
              </p>

              {referralValid && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  🎉 {language === "es" ? "50% off primer mes" : "50% off first month"}
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSelectPlan}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === "es" ? "Procesando..." : "Processing..."}
                </>
              ) : (
                language === "es" ? "Empieza ahora" : "Start now"
              )}
            </Button>
          </Card>
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
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Adbroll. {language === "es" ? "Todos los derechos reservados." : "All rights reserved."}</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {language === "es" ? "Privacidad" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              {language === "es" ? "Términos" : "Terms"}
            </Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
