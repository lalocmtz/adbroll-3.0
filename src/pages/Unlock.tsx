import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Sparkles, Check, Star, Zap, X, LogIn } from "lucide-react";
import { AnimatedMarqueeHero } from "@/components/ui/hero-3";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { FeatureSteps } from "@/components/ui/feature-section";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { NativeVideoPlayer } from "@/components/NativeVideoPlayer";
import PricingModal from "@/components/PricingModal";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { useState } from "react";

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

import mockupDashboard from "@/assets/mockup-dashboard.png";
import mockupScriptAnalysis from "@/assets/mockup-script-analysis.png";
import mockupOpportunities from "@/assets/mockup-opportunities.png";
import logoDark from "@/assets/logo-dark.png";
import step1Dashboard from "@/assets/step-1-dashboard.png";
import step2Analysis from "@/assets/step-2-analysis.png";
import step3Variants from "@/assets/step-3-variants.png";

const Unlock = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handleUnlock = () => {
    setEmailModalOpen(true);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleClose = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen landing-light text-foreground overflow-hidden relative">
      {/* Fixed Header with Close, Login, and Unlock buttons */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Close button */}
          <button 
            onClick={handleClose} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Volver al feed</span>
          </button>
          
          {/* Logo */}
          <button onClick={() => navigate("/app")} className="flex items-center absolute left-1/2 -translate-x-1/2">
            <img src={logoDark} alt="Adbroll" className="h-10" />
          </button>
          
          {/* Right buttons */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar sesión
            </Button>
            <Button onClick={handleUnlock} className="bg-primary hover:bg-primary-hover btn-glow">
              Desbloquear Adbroll Pro
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <AnimatedMarqueeHero 
        tagline="🔥 +10,000 creadores ya usan Adbroll" 
        title={<>
          De creador improvisado a{" "}
          <TextShimmer duration={2.5} spread={3} className="text-gradient font-bold">
            vendedor estratégico
          </TextShimmer>{" "}
          en <TypingAnimation text="TikTok Shop" duration={120} className="whitespace-nowrap" />
        </>} 
        description="Encuentra productos virales, copia guiones que venden y gana dinero creando. Todo con IA." 
        ctaText="Desbloquear Adbroll Pro" 
        onCtaClick={handleUnlock} 
      />

      {/* How it Works */}
      <section id="how-it-works" className="py-16 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              ¿Cómo funciona?
            </h2>
          </div>
          
          <FeatureSteps 
            features={[{
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
            }]} 
            title="De grabar al azar → a ganar estratégicamente en 3 pasos" 
            subtitle="Descubre qué está vendiendo hoy, replica con IA y cobra como creador desde el día uno." 
            autoPlayInterval={4000} 
            className="py-0" 
          />

          <div className="text-center mt-8">
            <Button size="lg" className="bg-primary hover:bg-primary-hover btn-glow" onClick={handleUnlock}>
              Desbloquear Adbroll Pro
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Con Adbroll <span className="text-4xl md:text-5xl">😎</span> vs Sin Adbroll <span className="text-4xl md:text-5xl">😡</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Sin Adbroll */}
            <div className="relative p-8 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/50 to-white shadow-lg">
              <div className="absolute -top-4 left-6">
                <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                  Sin Adbroll 😡
                </span>
              </div>
              <ul className="space-y-5 mt-4">
                {["Pierdes horas buscando ideas sin claridad", "Grabas videos que no conectan ni venden", "No sabes si lo que haces dará resultados", "Terminas frustrado, sin ventas y con dudas"].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-500 text-sm">✗</span>
                    </span>
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Con Adbroll */}
            <div className="relative p-8 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white shadow-lg">
              <div className="absolute -top-4 left-6">
                <span className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md">
                  Con Adbroll 😎
                </span>
              </div>
              <ul className="space-y-5 mt-4">
                {["Sabes qué productos y guiones están generando ventas", "Solo grabas lo que ya está validado por datos", "Empiezas a ganar más rápido y sin adivinar", "Tienes claridad, motivación y resultados reales"].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-500" />
                    </span>
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Product Tour */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Dentro de Adbroll</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Datos reales. IA integrada. Resultados más rápidos.
            </h2>
          </div>

          {/* Feature 1 */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <Badge className="badge-landing-light mb-4">Análisis de Scripts</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Convierte cualquier video viral en tu próximo guion ganador
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nuestra IA analiza videos reales, detecta qué parte genera ventas y te entrega un guion listo para grabar.
                </p>
                <Button onClick={handleUnlock} className="bg-primary hover:bg-primary-hover btn-glow">
                  Desbloquear Adbroll Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
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
                <Button onClick={handleUnlock} className="bg-primary hover:bg-primary-hover btn-glow">
                  Desbloquear Adbroll Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background my-20 relative">
        <div className="container z-10 mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.1 }} 
            viewport={{ once: true }} 
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
          >
            <Badge className="badge-landing-light mb-4">Testimonios reales</Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5 text-center">
              Creadores que cambiaron su juego con Adbroll
            </h2>
            <p className="text-center mt-5 text-muted-foreground">
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

      {/* Pricing Section */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="badge-landing-light mb-4">💸 Precio simple</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Un solo plan. Todo incluido.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sin planes confusos. Un solo acceso a todo lo que necesitas para convertir tu contenido en ventas.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="p-8 border-2 border-primary/20 relative overflow-hidden bg-white shadow-xl">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                POPULAR
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Adbroll Pro</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "Acceso a todos los videos y productos",
                  "Análisis de guiones con IA",
                  "Generador de variantes",
                  "Detector de oportunidades",
                  "Herramientas de creador",
                  "Soporte prioritario"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg" 
                className="w-full bg-primary hover:bg-primary-hover btn-glow"
                onClick={handleUnlock}
              >
                Desbloquear Adbroll Pro
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <Badge className="badge-landing-light mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Preguntas frecuentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              { q: "¿Qué es Adbroll?", a: "Adbroll es una plataforma que te ayuda a encontrar productos virales y guiones que ya están vendiendo en TikTok Shop para que puedas replicarlos." },
              { q: "¿De dónde salen los datos?", a: "Analizamos miles de videos de TikTok Shop diariamente usando IA para identificar los que más venden." },
              { q: "¿Cada cuánto se actualizan?", a: "Los datos se actualizan diariamente para que siempre tengas información fresca." },
              { q: "¿Puedo cancelar cuando quiera?", a: "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de cuenta." },
              { q: "¿Cómo se calculan los ingresos?", a: "Utilizamos datos públicos y estimaciones basadas en vistas, engagement y ventas reportadas." },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            ¿Listo para empezar a ganar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Únete a miles de creadores que ya están monetizando con datos, no con suerte.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary-hover btn-glow" onClick={handleUnlock}>
            Desbloquear Adbroll Pro
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Pricing Modal */}
      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
      
      {/* Email Capture Modal */}
      <EmailCaptureModal open={emailModalOpen} onOpenChange={setEmailModalOpen} referralCode={refCode} />
    </div>
  );
};

export default Unlock;
