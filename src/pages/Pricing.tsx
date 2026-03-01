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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

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

  const features = language === "es" 
    ? [
        "Dashboard con videos virales de TikTok Shop",
        "Scripts reales extraídos automáticamente",
        "Variantes IA ilimitadas para tus guiones",
        "Hooks generados por IA",
        "Oportunidades de productos con alto potencial",
        "Panel de afiliados (30% comisión recurrente)",
        "Acceso a campañas de marcas",
        "Ranking de creadores top",
        "Biblioteca personal de assets",
        "Soporte prioritario",
      ]
    : [
        "Dashboard with viral TikTok Shop videos",
        "Real scripts auto-extracted",
        "Unlimited AI script variants",
        "AI-generated hooks",
        "High-potential product opportunities",
        "Affiliate panel (30% recurring commission)",
        "Access to brand campaigns",
        "Top creator rankings",
        "Personal asset library",
        "Priority support",
      ];

  const faqItems = [
    {
      question: language === "es" ? "¿Qué incluye la suscripción?" : "What's included in the subscription?",
      answer: language === "es"
        ? "Acceso completo a todas las herramientas: videos virales, extracción de scripts, variantes IA, oportunidades de productos, campañas de marcas, y el panel de afiliados para ganar comisiones."
        : "Full access to all tools: viral videos, script extraction, AI variants, product opportunities, brand campaigns, and the affiliate panel to earn commissions.",
    },
    {
      question: language === "es" ? "¿Puedo cancelar en cualquier momento?" : "Can I cancel anytime?",
      answer: language === "es"
        ? "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración. No hay contratos ni compromisos."
        : "Yes, you can cancel your subscription at any time from your settings panel. No contracts or commitments.",
    },
    {
      question: language === "es" ? "¿Cómo funciona el programa de afiliados?" : "How does the affiliate program work?",
      answer: language === "es"
        ? "Ganas 30% de comisión recurrente por cada usuario que refieras mientras mantenga su suscripción activa. Es dinero pasivo real."
        : "You earn 30% recurring commission for every user you refer as long as they maintain their active subscription. It's real passive income.",
    },
  ];

  const handleSelectPlan = async () => {
    if (!session) {
      const refParam = referralCode ? `&ref=${referralCode}` : "";
      navigate(`/register?redirect=/pricing${refParam}&plan=pro`);
      return;
    }

    setLoadingPlan("pro");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: referralCode, plan: "pro" },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      
      throw new Error("No checkout URL returned");
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo iniciar el pago. Intenta de nuevo." 
          : "Could not start checkout. Please try again.",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const price = 25;
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
                ? "🎉 50% OFF en tu primer mes aplicado automáticamente"
                : "🎉 50% OFF your first month applied automatically"}
            </p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-0">
            {language === "es" ? "Plan único" : "Single plan"}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === "es" ? "Todo incluido por un precio simple" : "Everything included for one simple price"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "es"
              ? "Scripts virales, oportunidades de productos, herramientas IA y más"
              : "Viral scripts, product opportunities, AI tools and more"}
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="max-w-lg mx-auto mb-16">
          <Card className="relative p-8 border-2 border-primary shadow-xl shadow-primary/10">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              <Sparkles className="h-3 w-3 mr-1" />
              {language === "es" ? "ACCESO COMPLETO" : "FULL ACCESS"}
            </Badge>

            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl mb-4 bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Adbroll Pro</h3>
              <p className="text-muted-foreground">
                {language === "es" ? "Todas las herramientas para creadores de TikTok Shop" : "All tools for TikTok Shop creators"}
              </p>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-2">
                {referralValid ? (
                  <>
                    <span className="text-2xl text-muted-foreground line-through">${price}</span>
                    <span className="text-5xl font-bold text-primary">${discountedPrice.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-5xl font-bold">${price}</span>
                )}
                <span className="text-muted-foreground text-lg">/{language === "es" ? "mes" : "month"}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">~$500 MXN/{language === "es" ? "mes" : "month"}</p>
              {referralValid && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  🎉 50% off {language === "es" ? "primer mes" : "first month"}
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSelectPlan}
              disabled={loadingPlan === "pro"}
            >
              {loadingPlan === "pro" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === "es" ? "Procesando..." : "Processing..."}</>
              ) : (
                language === "es" ? "Empezar ahora" : "Start now"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {language === "es" 
                ? "Cancela cuando quieras · Sin compromisos · Pago seguro con Stripe"
                : "Cancel anytime · No commitments · Secure payment with Stripe"}
            </p>
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