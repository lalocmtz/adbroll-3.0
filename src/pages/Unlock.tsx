import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Sparkles, Check, X, LogIn, Loader2 } from "lucide-react";
import { FeatureSteps } from "@/components/ui/feature-section";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SimpleEmailCaptureModal } from "@/components/SimpleEmailCaptureModal";
import { trackInitiateCheckout } from "@/lib/analytics";

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
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubscribe = async () => {
    const prospectEmail = localStorage.getItem("adbroll_prospect_email");
    
    if (!prospectEmail) {
      setShowEmailModal(true);
      return;
    }

    // Proceed directly to Stripe checkout
    await processCheckout(prospectEmail);
  };

  const processCheckout = async (email: string) => {
    setIsLoading(true);
    
    // Track InitiateCheckout event for Meta Pixel
    trackInitiateCheckout(14.99, "USD", "Adbroll Pro");

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-guest", {
        body: {
          email: email,
          referral_code: refCode,
          plan: "pro",
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
      setIsLoading(false);
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
              <Badge className="badge-landing-light mb-3">💸 Un solo precio, todo incluido</Badge>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3">
                Desbloquea todo Adbroll
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                Scripts virales, análisis IA y oportunidades de productos. Todo por un precio simple.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-md mx-auto"
            >
              {/* Single Plan */}
              <Card className="p-6 md:p-8 border-2 border-primary bg-white relative shadow-xl ring-2 ring-primary/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">
                    <Sparkles className="h-3 w-3 mr-1 fill-current" />
                    ACCESO COMPLETO
                  </Badge>
                </div>
                <div className="text-center mb-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="text-2xl font-bold">Adbroll Pro</h3>
                  <p className="text-sm text-muted-foreground">Todo lo que necesitas para vender</p>
                </div>
                <div className="text-center mb-6">
                  <span className="text-5xl font-bold text-primary">$14.99</span>
                  <span className="text-muted-foreground text-lg">/mes</span>
                  <p className="text-sm text-muted-foreground mt-1">~$300 MXN/mes</p>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  {[
                    "Dashboard con videos virales",
                    "Scripts reales extraídos automáticamente",
                    "Variantes IA ilimitadas",
                    "Hooks generados por IA",
                    "Oportunidades de productos",
                    "Panel de afiliados (30% comisión)",
                    "Todas las herramientas incluidas"
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full h-12 text-base bg-primary hover:bg-primary-hover" 
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Suscribirme ahora
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
            <p className="text-sm">Cargando...</p>
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
                {["Sabes exactamente qué grabar (y por qué funciona)", "Tus videos siguen estructuras que venden", "Usas datos reales para tomar decisiones", "Cada contenido está respaldado por resultados"].map((item, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-500 text-xs md:text-sm">✓</span>
                    </span>
                    <span className="text-foreground/80 text-sm md:text-base">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-8 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center mb-12 md:mb-24">
            <div className="order-2 md:order-1">
              <Badge className="badge-landing-light mb-3 md:mb-4">📝 Extractor de guiones</Badge>
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Copia lo que ya está vendiendo
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                Nuestra IA analiza los videos más exitosos y extrae sus guiones palabra por palabra. 
                Ve exactamente qué dicen, cómo lo estructuran y por qué funciona.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["Transcripción automática con IA", "Análisis de estructura (hook, body, CTA)", "Variantes listas para adaptar"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <img 
                src={mockupScriptAnalysis} 
                alt="Script Analysis" 
                className="rounded-xl md:rounded-2xl shadow-lg md:shadow-2xl border border-border w-full"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <img 
                src={mockupOpportunities} 
                alt="Product Opportunities" 
                className="rounded-xl md:rounded-2xl shadow-lg md:shadow-2xl border border-border w-full"
              />
            </div>
            <div>
              <Badge className="badge-landing-light mb-3 md:mb-4">💎 Detector de oportunidades</Badge>
              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                Encuentra las gemas ocultas
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg mb-4 md:mb-6">
                Nuestro algoritmo identifica productos con alta comisión, buenas ventas y poca competencia.
                Son las "gemas ocultas" que otros creadores aún no han descubierto.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["Índice de oportunidad calculado por IA", "Filtros por comisión, ventas y competencia", "Actualización diaria con nuevos productos"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-8 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-12">
            <Badge className="badge-landing-light mb-3 md:mb-4">⭐ Creadores reales</Badge>
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold">
              Únete a miles de creadores
            </h2>
          </div>
          <div className="flex gap-4 md:gap-6 justify-center overflow-hidden">
            <TestimonialsColumn testimonials={testimonials.slice(0, 3)} duration={15} />
            <TestimonialsColumn testimonials={testimonials.slice(3, 6)} duration={18} className="hidden md:flex" />
            <TestimonialsColumn testimonials={testimonials.slice(6, 9)} duration={20} className="hidden lg:flex" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-12">
            <Badge className="badge-landing-light mb-3 md:mb-4">❓ Preguntas frecuentes</Badge>
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold">
              ¿Tienes dudas?
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-border">
                <AccordionTrigger className="text-left text-sm md:text-base py-4">
                  ¿Qué incluye la suscripción de $14.99/mes?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base pb-4">
                  Incluye acceso completo al dashboard de videos virales, extracción automática de scripts, 
                  variantes IA ilimitadas, detector de oportunidades de productos, panel de afiliados con 30% de comisión, 
                  y todas las herramientas de análisis. Todo en un solo precio sin límites.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-b border-border">
                <AccordionTrigger className="text-left text-sm md:text-base py-4">
                  ¿Cómo funciona el programa de afiliados?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base pb-4">
                  Comparte tu código de referido y gana 30% de comisión ($4.50 USD) por cada persona 
                  que se suscriba usando tu código. La comisión es recurrente mientras la persona 
                  mantenga su suscripción activa.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-b border-border">
                <AccordionTrigger className="text-left text-sm md:text-base py-4">
                  ¿Puedo cancelar cuando quiera?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base pb-4">
                  Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración. 
                  No hay contratos ni compromisos a largo plazo. Al cancelar, mantendrás acceso hasta 
                  el final de tu período de facturación.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4" className="border-b border-border">
                <AccordionTrigger className="text-left text-sm md:text-base py-4">
                  ¿Para qué mercados funciona Adbroll?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base pb-4">
                  Actualmente cubrimos TikTok Shop México y Estados Unidos. Puedes cambiar entre mercados 
                  fácilmente desde el dashboard para ver los videos y productos más exitosos en cada región.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5" className="border-b border-border">
                <AccordionTrigger className="text-left text-sm md:text-base py-4">
                  ¿Los guiones están en español?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base pb-4">
                  Sí. Los guiones se extraen en el idioma original del video. Para el mercado de México, 
                  la mayoría están en español. Nuestra IA también puede generar variantes optimizadas en español.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-10 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
              ¿Listo para vender más?
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto mb-6 md:mb-8">
              Únete a miles de creadores que ya usan Adbroll para crear videos que venden.
            </p>
            <Button 
              size="lg" 
              className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg bg-primary hover:bg-primary-hover"
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Empezar ahora — $14.99/mes
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Sin compromisos · Cancela cuando quieras
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoDark} alt="Adbroll" className="h-6" />
              <span className="text-sm text-muted-foreground">© 2025</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
                Términos
              </button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
                Privacidad
              </button>
              <button onClick={() => navigate("/refund-policy")} className="hover:text-foreground transition-colors">
                Reembolsos
              </button>
              <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors">
                Soporte
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Email Capture Modal */}
      <SimpleEmailCaptureModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onCaptured={handleEmailCaptured}
        redirectTo="unlock"
      />
    </div>
  );
};

export default Unlock;
