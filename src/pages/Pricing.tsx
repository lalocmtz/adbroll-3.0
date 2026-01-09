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
  Video,
  Wand2,
  X,
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

  const proFeatures = language === "es" 
    ? [
        "Dashboard con videos virales",
        "Scripts reales extraídos automáticamente",
        "Variantes IA ilimitadas",
        "Hooks generados por IA",
        "Oportunidades de productos",
        "Panel de afiliados (30% comisión)",
      ]
    : [
        "Dashboard with viral videos",
        "Real scripts auto-extracted",
        "Unlimited AI variants",
        "AI-generated hooks",
        "Product opportunities",
        "Affiliate panel (30% commission)",
      ];

  const premiumFeatures = language === "es"
    ? [
        "Todo lo de Pro incluido",
        "5 videos IA/mes con lip-sync",
        "Genera videos sin grabarte",
        "Voz en español incluida",
        "Descarga directa para TikTok",
        "Compra packs adicionales",
      ]
    : [
        "Everything in Pro included",
        "5 AI videos/month with lip-sync",
        "Generate videos without recording",
        "Spanish voice included",
        "Direct download for TikTok",
        "Buy additional packs",
      ];

  const faqItems = [
    {
      question: language === "es" ? "¿Cuál es la diferencia entre Pro y Premium?" : "What's the difference between Pro and Premium?",
      answer: language === "es"
        ? "Pro te da acceso a todos los scripts, análisis y variantes IA. Premium incluye todo eso MÁS la capacidad de generar videos con lip-sync usando IA — perfecto si no quieres salir a cámara."
        : "Pro gives you access to all scripts, analysis and AI variants. Premium includes all that PLUS the ability to generate lip-sync videos using AI — perfect if you don't want to be on camera.",
    },
    {
      question: language === "es" ? "¿Puedo cancelar en cualquier momento?" : "Can I cancel anytime?",
      answer: language === "es"
        ? "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración."
        : "Yes, you can cancel your subscription at any time from your settings panel.",
    },
    {
      question: language === "es" ? "¿Qué pasa si se acaban mis créditos de video?" : "What happens if I run out of video credits?",
      answer: language === "es"
        ? "Puedes comprar packs adicionales de videos: 3 videos por $9.99 o 10 videos por $24.99. Los créditos comprados no expiran."
        : "You can buy additional video packs: 3 videos for $9.99 or 10 videos for $24.99. Purchased credits never expire.",
    },
  ];

  const handleSelectPlan = async (plan: "pro" | "premium") => {
    if (!session) {
      const refParam = referralCode ? `&ref=${referralCode}` : "";
      navigate(`/register?redirect=/pricing${refParam}&plan=${plan}`);
      return;
    }

    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: referralCode, plan },
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

  const proPrice = 14.99;
  const premiumPrice = 29.99;
  const discountedProPrice = referralValid ? proPrice * 0.5 : proPrice;
  const discountedPremiumPrice = referralValid ? premiumPrice * 0.5 : premiumPrice;

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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === "es" ? "Elige tu plan" : "Choose your plan"}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {language === "es"
              ? "Desde scripts virales hasta videos generados con IA — elige lo que necesitas"
              : "From viral scripts to AI-generated videos — choose what you need"}
          </p>
        </div>

        {/* Two Column Pricing */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-16">
          {/* Pro Plan */}
          <Card className="relative p-6 border-2 border-border hover:border-primary/50 transition-colors">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-xl mb-4 bg-muted text-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Adbroll Pro</h3>
              <p className="text-sm text-muted-foreground">
                {language === "es" ? "Para creadores que graban su contenido" : "For creators who record their content"}
              </p>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-2">
                {referralValid ? (
                  <>
                    <span className="text-xl text-muted-foreground line-through">${proPrice}</span>
                    <span className="text-4xl font-bold text-primary">${discountedProPrice.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold">${proPrice}</span>
                )}
                <span className="text-muted-foreground">/{language === "es" ? "mes" : "month"}</span>
              </div>
              {referralValid && (
                <p className="text-xs text-green-600 mt-1">50% off {language === "es" ? "primer mes" : "first month"}</p>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-border mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-muted-foreground/50" />
                <span>{language === "es" ? "Videos IA no incluidos" : "AI videos not included"}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => handleSelectPlan("pro")}
              disabled={loadingPlan === "pro"}
            >
              {loadingPlan === "pro" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === "es" ? "Procesando..." : "Processing..."}</>
              ) : (
                language === "es" ? "Empezar con Pro" : "Start with Pro"
              )}
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="relative p-6 border-2 border-primary shadow-xl shadow-primary/10">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              {language === "es" ? "POPULAR" : "POPULAR"}
            </Badge>

            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-xl mb-4 bg-primary/10 text-primary">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Adbroll Premium</h3>
              <p className="text-sm text-muted-foreground">
                {language === "es" ? "Para creadores que NO quieren salir a cámara" : "For creators who DON'T want to be on camera"}
              </p>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-2">
                {referralValid ? (
                  <>
                    <span className="text-xl text-muted-foreground line-through">${premiumPrice}</span>
                    <span className="text-4xl font-bold text-primary">${discountedPremiumPrice.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-4xl font-bold">${premiumPrice}</span>
                )}
                <span className="text-muted-foreground">/{language === "es" ? "mes" : "month"}</span>
              </div>
              {referralValid && (
                <p className="text-xs text-green-600 mt-1">50% off {language === "es" ? "primer mes" : "first month"}</p>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className={index === 0 ? "font-medium" : ""}>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-primary/20 mb-4">
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Wand2 className="h-4 w-4" />
                <span>{language === "es" ? "Genera videos sin grabarte" : "Generate videos without recording"}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => handleSelectPlan("premium")}
              disabled={loadingPlan === "premium"}
            >
              {loadingPlan === "premium" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === "es" ? "Procesando..." : "Processing..."}</>
              ) : (
                language === "es" ? "Empezar con Premium" : "Start with Premium"
              )}
            </Button>
          </Card>
        </div>

        {/* Credit Packs Info */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <div className="bg-muted/50 rounded-xl p-6 border border-border">
            <h3 className="font-semibold mb-2">
              {language === "es" ? "¿Necesitas más videos?" : "Need more videos?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {language === "es" 
                ? "Los usuarios Premium pueden comprar packs adicionales de créditos"
                : "Premium users can purchase additional credit packs"}
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <div className="bg-background rounded-lg px-4 py-2">
                <span className="font-semibold">3 videos</span>
                <span className="text-muted-foreground ml-2">$9.99</span>
              </div>
              <div className="bg-background rounded-lg px-4 py-2 border-2 border-primary">
                <span className="font-semibold">10 videos</span>
                <span className="text-muted-foreground ml-2">$24.99</span>
                <Badge className="ml-2 text-[10px]">MEJOR DEAL</Badge>
              </div>
            </div>
          </div>
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
