import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Sparkles, Check, Star, Zap, X, LogIn, Loader2 } from "lucide-react";
import { AnimatedMarqueeHero } from "@/components/ui/hero-3";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { FeatureSteps } from "@/components/ui/feature-section";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SimpleEmailCaptureModal } from "@/components/SimpleEmailCaptureModal";

const testimonials = [{
  text: "Adbroll me hizo pasar de adivinar qué productos grabar a saber exactamente qué vende. Ahora mis videos generan ventas todos los días.",
  image: "https://randomuser.me/api/portraits/women/11.jpg",
  name: "María Delgado",
  role: "Creadora de TikTok Shop"
}, {
  text: "Subo mis videos a Adbroll y en segundos tengo guiones virales listos para grabar. Me ahorra horas y me duplicó mis comisiones.",
  image: "https://randomuser.me/api/portraits/men/21.jpg",
  name: "Luis Hernández",
  role: "Creador & Afiliado"
}, {
  text: "Antes probaba productos al azar. Con Adbroll solo promociono lo que ya está vendiendo. Mis ingresos son mucho más constantes.",
  image: "https://randomuser.me/api/portraits/women/32.jpg",
  name: "Fernanda Ruiz",
  role: "Creadora en TikTok"
}, {
  text: "La parte de análisis de guiones es una locura. Adbroll me explica por qué un video funciona y cómo replicarlo. Es como tener un equipo creativo 24/7.",
  image: "https://randomuser.me/api/portraits/men/45.jpg",
  name: "Carlos Rivas",
  role: "Creador UGC"
}, {
  text: "La sección de oportunidades me ayudó a encontrar productos con alta comisión y baja competencia. Subí mi ganancia por venta un 60%.",
  image: "https://randomuser.me/api/portraits/women/41.jpg",
  name: "Andrea Soto",
  role: "Vendedora en TikTok Shop"
}, {
  text: "Desde que uso Adbroll, cada video que hago tiene intención, estructura y estrategia. Esto dejó de ser suerte y se volvió un sistema.",
  image: "https://randomuser.me/api/portraits/men/51.jpg",
  name: "Diego Morales",
  role: "Creador de Contenido"
}, {
  text: "El extractor de guiones me permite ver lo que realmente dicen los videos virales. Gracias a eso ahora sé exactamente qué copiar y mejorar.",
  image: "https://randomuser.me/api/portraits/men/66.jpg",
  name: "Raúl Castillo",
  role: "Afiliado"
}, {
  text: "Adbroll es la herramienta que todos los creadores estaban esperando. Me ayudó a dejar de procrastinar y empezar a ganar dinero diario.",
  image: "https://randomuser.me/api/portraits/women/67.jpg",
  name: "Ariana Mendoza",
  role: "Creadora Principiante"
}, {
  text: "Con Adbroll ya no tengo bloqueos creativos. Todos mis videos salen de aquí, y mi cuenta está creciendo más rápido que nunca.",
  image: "https://randomuser.me/api/portraits/women/77.jpg",
  name: "Cassandra Torres",
  role: "Creadora de TikTok Shop"
}];

import logoDark from "@/assets/logo-dark.png";
import step1Dashboard from "@/assets/step-1-dashboard.png";
import step2Analysis from "@/assets/step-2-analysis.png";
import step3Variants from "@/assets/step-3-variants.png";
import mockupScriptAnalysis from "@/assets/mockup-script-analysis.png";
import mockupOpportunities from "@/assets/mockup-opportunities.png";

const Unlock = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRefCode = searchParams.get("ref");
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "premium" | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [hasProspectEmail, setHasProspectEmail] = useState(false);

  // Get refCode from URL or localStorage
  const refCode = urlRefCode || localStorage.getItem("adbroll_ref_code");

  // Save refCode to localStorage if present in URL
  useEffect(() => {
    if (urlRefCode) {
      localStorage.setItem("adbroll_ref_code", urlRefCode.toUpperCase());
    }
  }, [urlRefCode]);

  // Check if email exists on mount - if not, show modal immediately
  useEffect(() => {
    const prospectEmail = localStorage.getItem("adbroll_prospect_email");
    if (prospectEmail) {
      setHasProspectEmail(true);
    } else {
      // No email - show modal immediately
      setShowEmailModal(true);
    }
  }, []);

  // Auto-scroll to pricing after email is captured
  useEffect(() => {
    if (hasProspectEmail && window.location.hash === "#pricing") {
      setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [hasProspectEmail]);

  const handleSelectPlan = async (plan: "pro" | "premium") => {
    const prospectEmail = localStorage.getItem("adbroll_prospect_email");
    
    if (!prospectEmail) {
      setShowEmailModal(true);
      return;
    }

    // Proceed directly to Stripe checkout
    await processCheckout(plan, prospectEmail);
  };

  const processCheckout = async (plan: "pro" | "premium", email: string) => {
    setLoadingPlan(plan);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-guest", {
        body: {
          email: email,
          referral_code: refCode,
          plan: plan,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Error al procesar. Intenta de nuevo.");
    } finally {
      setLoadingPlan(null);
    }
  };

  // After email capture, just show pricing (no auto-checkout)
  const handleEmailCaptured = () => {
    setShowEmailModal(false);
    setHasProspectEmail(true);
    // Scroll to pricing section
    setTimeout(() => {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleClose = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen landing-light text-foreground overflow-hidden relative">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-3 md:px-4 py-2.5 md:py-4 flex items-center justify-between">
          <button onClick={handleClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
            <span className="text-sm font-medium hidden md:inline">Volver al feed</span>
          </button>
          
          <button onClick={() => navigate("/app")} className="flex items-center absolute left-1/2 -translate-x-1/2">
            <img src={logoDark} alt="Adbroll" className="h-7 md:h-10" />
          </button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing Section - Only visible after email capture */}
      {hasProspectEmail ? (
        <section id="pricing" className="pt-24 md:pt-28 pb-10 md:pb-16 landing-section-alt">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <Badge className="badge-landing-light mb-3">💸 Elige tu plan</Badge>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3">
                Desbloquea todo Adbroll
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                Scripts virales para todos. Videos IA para quienes no quieren salir a cámara.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-3xl mx-auto grid md:grid-cols-2 gap-4"
            >
              {/* Pro Plan */}
              <Card className="p-5 md:p-6 border-2 border-border bg-white hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="text-center mb-4">
                  <Sparkles className="h-7 w-7 mx-auto mb-2 text-foreground" />
                  <h3 className="text-xl font-bold">Pro</h3>
                  <p className="text-xs text-muted-foreground">Para creadores que graban</p>
                </div>
                <div className="text-center mb-5">
                  <span className="text-4xl font-bold">$14.99</span>
                  <span className="text-muted-foreground">/mes</span>
                  <p className="text-xs text-muted-foreground mt-1">~$300 MXN/mes</p>
                </div>
                <ul className="space-y-2.5 mb-5 text-sm">
                  {[
                    "Scripts reales extraídos de videos virales",
                    "Variantes IA ilimitadas",
                    "Oportunidades de productos",
                    "Panel de afiliados (30% comisión)",
                    "Acceso completo al dashboard"
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={() => handleSelectPlan("pro")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === "pro" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Empezar con Pro"
                  )}
                </Button>
              </Card>

              {/* Premium Plan - HIGHLIGHTED */}
              <Card className="p-5 md:p-6 border-2 border-primary bg-white relative shadow-xl ring-2 ring-primary/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white px-3 py-1">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    MÁS POPULAR
                  </Badge>
                </div>
                <div className="text-center mb-4">
                  <Zap className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <h3 className="text-xl font-bold">Premium</h3>
                  <p className="text-xs text-muted-foreground">Sin salir a cámara</p>
                </div>
                <div className="text-center mb-5">
                  <span className="text-4xl font-bold text-primary">$29.99</span>
                  <span className="text-muted-foreground">/mes</span>
                  <p className="text-xs text-muted-foreground mt-1">~$600 MXN/mes</p>
                </div>
                <ul className="space-y-2.5 mb-5 text-sm">
                  <li className="flex items-start gap-2 font-medium text-primary">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Todo lo de Pro incluido</span>
                  </li>
                  {[
                    "5 videos IA/mes con lip-sync",
                    "Genera videos sin grabarte",
                    "Compra packs adicionales",
                    "Prioridad en nuevas funciones"
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full h-11 bg-primary hover:bg-primary-hover" 
                  onClick={() => handleSelectPlan("premium")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === "premium" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Empezar con Premium
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </Card>
            </motion.div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Cancela cuando quieras · Sin compromisos · Pago seguro con Stripe
            </p>
          </div>
        </section>
      ) : (
        // Placeholder while email modal is open - minimal height to keep layout stable
        <section className="pt-24 md:pt-28 pb-10 md:pb-16 landing-section-alt min-h-[60vh] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm">Cargando planes...</p>
          </div>
        </section>
      )}

      {/* How it Works */}
      <section id="how-it-works" className="py-10 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4 md:mb-10">
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold text-foreground">
              ¿Cómo funciona?
            </h2>
          </div>
          
          {/* Demo Video */}
          <div className="max-w-4xl mx-auto mb-6 md:mb-16">
            <div className="rounded-xl md:rounded-2xl overflow-hidden shadow-lg md:shadow-2xl border border-border">
              <video
                src="https://gcntnilurlulejwwtpaa.supabase.co/storage/v1/object/public/assets/landing-video-1766294993055.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-video object-cover"
              />
            </div>
          </div>
          
          <FeatureSteps features={[{
            step: "1",
            title: "Qué está funcionando hoy",
            content: "Encuentra los videos con más ventas y sus productos vinculados.",
            image: step1Dashboard
          }, {
            step: "2",
            title: "Toma el guion viral y adáptalo",
            content: "Nuestra IA te lo da listo para grabar y optimizar.",
            image: step2Analysis
          }, {
            step: "3",
            title: "Graba. Publica. Cobra.",
            content: "Monetiza como creador sin tener que adivinar.",
            image: step3Variants
          }]} title="De grabar al azar → a ganar estratégicamente en 3 pasos" subtitle="Descubre qué está vendiendo hoy, replica con IA y cobra como creador desde el día uno." autoPlayInterval={4000} className="py-0" />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-8 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Con Adbroll <span className="text-xl md:text-3xl lg:text-4xl">😎</span> vs Sin Adbroll <span className="text-xl md:text-3xl lg:text-4xl">😡</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-5xl mx-auto">
            {/* Sin Adbroll */}
            <div className="relative p-5 md:p-8 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/50 to-white shadow-lg">
              <div className="absolute -top-3 md:-top-4 left-4 md:left-6">
                <span className="bg-red-500 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold shadow-md">
                  Sin Adbroll 😡
                </span>
              </div>
              <ul className="space-y-3 md:space-y-5 mt-3 md:mt-4">
                {["Pierdes horas buscando ideas sin claridad", "Grabas videos que no conectan ni venden", "No sabes si lo que haces dará resultados", "Terminas frustrado, sin ventas y con dudas"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-500 text-xs md:text-sm">✗</span>
                    </span>
                    <span className="text-foreground/80 text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Con Adbroll */}
            <div className="relative p-5 md:p-8 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white shadow-lg">
              <div className="absolute -top-3 md:-top-4 left-4 md:left-6">
                <span className="bg-green-500 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-semibold shadow-md">
                  Con Adbroll 😎
                </span>
              </div>
              <ul className="space-y-3 md:space-y-5 mt-3 md:mt-4">
                {["Sabes qué productos y guiones están generando ventas", "Solo grabas lo que ya está validado por datos", "Empiezas a ganar más rápido y sin adivinar", "Tienes claridad, motivación y resultados reales"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    </span>
                    <span className="text-foreground/80 text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Product Tour */}
      <section className="py-8 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-12">
            <Badge className="badge-landing-light mb-2 md:mb-4">Dentro de Adbroll</Badge>
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4">
              Datos reales. IA integrada. Resultados más rápidos.
            </h2>
          </div>

          {/* Feature 1 */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <Badge className="badge-landing-light mb-4">Análisis de Scripts</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Convierte cualquier video viral en tu próximo guion ganador
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nuestra IA analiza videos reales, detecta qué parte genera ventas y te entrega un guion listo para grabar.
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <div className="mockup-browser float-element">
                  <div className="mockup-browser-bar">
                    <div className="mockup-browser-dot bg-red-400" />
                    <div className="mockup-browser-dot bg-yellow-400" />
                    <div className="mockup-browser-dot bg-green-400" />
                  </div>
                  <img src={mockupScriptAnalysis} alt="Análisis de Scripts con IA" className="w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="mockup-browser float-element">
                  <div className="mockup-browser-bar">
                    <div className="mockup-browser-dot bg-red-400" />
                    <div className="mockup-browser-dot bg-yellow-400" />
                    <div className="mockup-browser-dot bg-green-400" />
                  </div>
                  <img src={mockupOpportunities} alt="Oportunidades de Productos" className="w-full" />
                </div>
              </div>
              <div>
                <Badge className="badge-landing-light mb-4">Tu Copiloto IA</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Tu copiloto de IA trabaja por ti 24/7 para encontrar lo que vende
                </h3>
                <p className="text-muted-foreground mb-6">
                  Adbroll está potenciado por un sistema de IA que analiza millones de datos, encuentra oportunidades y te guía paso a paso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background my-10 md:my-16 relative">
        <div className="container z-10 mx-auto px-4">
          <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.8,
            delay: 0.1
          }} viewport={{
            once: true
          }} className="flex flex-col items-center justify-center max-w-[540px] mx-auto">
            <Badge className="badge-landing-light mb-2 md:mb-4">Testimonios reales</Badge>
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold tracking-tighter mt-3 md:mt-5 text-center">
              Creadores que cambiaron su juego con Adbroll
            </h2>
            <p className="text-center mt-3 md:mt-5 text-sm md:text-base text-muted-foreground">
              Historias reales de creadores como tú.
            </p>
          </motion.div>
          
          <div className="flex justify-center gap-6 mt-10 max-h-[750px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
            <TestimonialsColumn testimonials={testimonials.slice(0, 3)} duration={15000} />
            <TestimonialsColumn testimonials={testimonials.slice(3, 6)} className="hidden md:block" duration={19000} />
            <TestimonialsColumn testimonials={testimonials.slice(6, 9)} className="hidden lg:block" duration={17000} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="badge-landing-light mb-2 md:mb-4">FAQ</Badge>
            <h2 className="text-lg md:text-3xl lg:text-4xl font-bold">
              Preguntas frecuentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[{
              q: "¿Qué es Adbroll?",
              a: "Adbroll es una plataforma que te ayuda a encontrar productos virales y guiones que ya están vendiendo en TikTok Shop para que puedas replicarlos."
            }, {
              q: "¿Cuánto cuesta Adbroll?",
              a: "Tenemos dos planes: Pro a $14.99/mes para creadores que graban sus propios videos, y Premium a $29.99/mes que incluye 5 videos IA mensuales para quienes no quieren salir a cámara."
            }, {
              q: "¿De dónde salen los datos?",
              a: "Analizamos miles de videos de TikTok Shop diariamente usando IA para identificar los que más venden."
            }, {
              q: "¿Cada cuánto se actualizan?",
              a: "Los datos se actualizan diariamente para que siempre tengas información fresca."
            }, {
              q: "¿Puedo cancelar cuando quiera?",
              a: "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de cuenta."
            }, {
              q: "¿Cómo se calculan los ingresos?",
              a: "Utilizamos datos públicos y estimaciones basadas en vistas, engagement y ventas reportadas."
            }].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl md:text-3xl font-bold mb-4">
            ¿Listo para empezar a vender?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Únete a más de 10,000 creadores que ya usan Adbroll para encontrar productos virales y guiones que venden.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary-hover"
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          >
            Ver planes y precios
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Email Capture Modal - Required before seeing pricing */}
      <SimpleEmailCaptureModal
        open={showEmailModal}
        onOpenChange={(open) => {
          // Don't allow closing if no email captured yet
          if (!open && !hasProspectEmail) return;
          setShowEmailModal(open);
        }}
        feature="unlock_page"
        onSuccess={handleEmailCaptured}
        redirectOnSuccess={false}
      />
    </div>
  );
};

export default Unlock;