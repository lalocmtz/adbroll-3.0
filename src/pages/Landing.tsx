import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Sparkles, Check, Star, Zap } from "lucide-react";
import PricingModal from "@/components/PricingModal";
import { AnimatedMarqueeHero } from "@/components/ui/hero-3";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { FeatureSteps } from "@/components/ui/feature-section";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { NativeVideoPlayer } from "@/components/NativeVideoPlayer";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";

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

// Import mockups
import mockupDashboard from "@/assets/mockup-dashboard.png";
import mockupScriptAnalysis from "@/assets/mockup-script-analysis.png";
import mockupOpportunities from "@/assets/mockup-opportunities.png";

// Import logos
import logoDark from "@/assets/logo-dark.png";

// Import step images
import step1Dashboard from "@/assets/step-1-dashboard.png";
import step2Analysis from "@/assets/step-2-analysis.png";
import step3Variants from "@/assets/step-3-variants.png";

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRefCode = searchParams.get("ref");
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  // Get refCode from URL or localStorage
  const refCode = urlRefCode || localStorage.getItem("adbroll_ref_code");

  // Save refCode to localStorage if present in URL
  useEffect(() => {
    if (urlRefCode) {
      localStorage.setItem("adbroll_ref_code", urlRefCode.toUpperCase());
    }
  }, [urlRefCode]);

  const handleCTA = () => {
    setEmailModalOpen(true);
  };

  return (
    <div className="min-h-screen landing-light text-foreground overflow-hidden">
      {/* Header - Compact on mobile */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-3 md:px-4 py-2.5 md:py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center">
            <img src={logoDark} alt="Adbroll" className="h-7 md:h-10" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:flex" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={handleCTA} className="bg-primary hover:bg-primary-hover btn-glow text-xs md:text-sm px-3 md:px-4">
              <span className="hidden sm:inline">Empieza ahora</span>
              <span className="sm:hidden">Empezar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Animated Marquee */}
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
        ctaText="Empieza ahora" 
        onCtaClick={handleCTA} 
      />

      {/* How it Works - Reduced mobile spacing */}
      <section id="how-it-works" className="py-10 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-foreground">
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
            <Button size="lg" className="bg-primary hover:bg-primary-hover btn-glow" onClick={handleCTA}>
              Empieza ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Section - Reduced mobile spacing */}
      <section className="py-12 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-xl md:text-5xl font-bold mb-4">
              Con Adbroll <span className="text-2xl md:text-5xl">😎</span> vs Sin Adbroll <span className="text-2xl md:text-5xl">😡</span>
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

          {/* Feature 1: Script Analysis */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <Badge className="badge-landing-light mb-4">Análisis de Scripts</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Convierte cualquier video viral en tu próximo guion ganador
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nuestra IA analiza videos reales, detecta qué parte genera ventas y te entrega un guion listo para grabar.
                  <span className="block mt-2 text-foreground/80 font-medium">
                    Graba con confianza sabiendo que cada palabra ya está validada por datos reales.
                  </span>
                </p>
                <ul className="space-y-3 mb-6">
                  {[{
                    icon: "🧠",
                    text: "Transcribe automáticamente cualquier video"
                  }, {
                    icon: "🔍",
                    text: "Identifica el gancho, cuerpo y cierre que vende"
                  }, {
                    icon: "💸",
                    text: "Detecta patrones de venta comprobados"
                  }, {
                    icon: "✨",
                    text: "Te da variantes optimizadas para maximizar vistas y conversiones"
                  }].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleCTA} className="bg-primary hover:bg-primary-hover btn-glow">
                  Empieza ahora
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

          {/* Feature 2: Product Opportunities */}
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
                  <span className="block mt-2 text-foreground/80 font-medium">
                    Tú solo eliges, grabas y ganas.
                  </span>
                </p>
                <ul className="space-y-3 mb-6">
                  {[{
                    icon: "📊",
                    text: "Detecta productos con poca competencia y alta comisión"
                  }, {
                    icon: "🧠",
                    text: "Calcula el potencial de cada producto por ti"
                  }, {
                    icon: "💰",
                    text: "Comisiones del 15-30% por venta"
                  }, {
                    icon: "🚀",
                    text: "Solo muestra oportunidades con alto potencial de ganancias"
                  }].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleCTA} className="bg-primary hover:bg-primary-hover btn-glow">
                  Empieza ahora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              30 segundos que pueden cambiar cómo ganas dinero online
            </h2>
            <p className="text-lg text-muted-foreground">
              Mira cómo funciona Adbroll por dentro y descubre cómo cientos de creadores están generando ingresos sin adivinar, sin complicaciones y sin ser expertos.
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <NativeVideoPlayer
              videoUrl="https://gcntnilurlulejwwtpaa.supabase.co/storage/v1/object/public/assets/landing-video-1765059331622.mov"
              className="shadow-[0_40px_100px_-25px_rgba(0,0,0,0.25)]"
              autoPlayOnScroll
            />
          </div>

          <div className="text-center mt-10">
            <Button size="lg" className="bg-primary hover:bg-primary-hover btn-glow" onClick={handleCTA}>
              Empieza ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background my-20 relative">
        <div className="container z-10 mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} 
            viewport={{ once: true }} 
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
          >
            <Badge className="badge-landing-light mb-4">Testimonios reales</Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5 text-center">
              Creadores que cambiaron su juego con Adbroll
            </h2>
            <p className="text-center mt-5 text-muted-foreground">
              Historias de cómo miles de creadores están generando ventas con estrategia, no suerte.
            </p>
          </motion.div>

          <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn testimonials={testimonials.slice(0, 3)} duration={15} />
            <TestimonialsColumn testimonials={testimonials.slice(3, 6)} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={testimonials.slice(6, 9)} className="hidden lg:block" duration={17} />
          </div>
        </div>
      </section>

      {/* Single Plan Pricing */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Plan único</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Adbroll Pro — $29 USD/mes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un solo plan con acceso completo. Si vienes con código de referido, obtienes <span className="text-primary font-semibold">50% OFF</span> tu primer mes.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="relative p-8 border-2 border-primary shadow-xl shadow-primary/10">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
                <Star className="h-3 w-3 mr-1" />
                Plan único
              </Badge>

              <div className="text-center mb-6 pt-4">
                <div className="inline-flex p-3 rounded-xl mb-4 bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Adbroll Pro</h3>
                <p className="text-muted-foreground text-sm mb-4">Todo lo que necesitas para vender más en TikTok Shop</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">~$499 MXN/mes</p>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "Acceso completo a TikTok Shop México y USA",
                  "Scripts reales + extractor automático",
                  "Variantes IA ilimitadas",
                  "Hooks generados por IA",
                  "Oportunidades de productos y creadores",
                  "Favoritos, dashboard completo y analíticas",
                  "Panel de afiliados (gana 30% recurrente)",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full bg-primary hover:bg-primary-hover" size="lg" onClick={handleCTA}>
                Empieza ahora
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {[{
                question: "¿Cuánto cuesta Adbroll?",
                answer: "Adbroll Pro cuesta $29 USD/mes (~$499 MXN/mes). Un solo plan con acceso completo a todas las funciones."
              }, {
                question: "¿Qué tan precisos son los datos?",
                answer: "Nuestros datos provienen directamente de Kalodata, la fuente más confiable para métricas de TikTok Shop. Actualizamos los rankings y videos diariamente para darte información real y actualizada."
              }, {
                question: "¿Funciona para México y Estados Unidos?",
                answer: "Sí, funciona para TikTok Shop México y Estados Unidos. Puedes cambiar de país dentro del panel."
              }, {
                question: "¿Puedo ganar dinero recomendando Adbroll?",
                answer: "¡Sí! Con nuestro programa de afiliados ganas el 30% de comisión recurrente por cada usuario que se suscriba con tu código. Eso es aproximadamente $8.70 USD al mes por cada usuario activo."
              }, {
                question: "¿Puedo cancelar cuando quiera?",
                answer: "Absolutamente. No hay contratos ni compromisos a largo plazo. Puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración."
              }, {
                question: "¿Necesito experiencia previa?",
                answer: "No. Adbroll está diseñado tanto para creadores nuevos como experimentados. La IA te guía en cada paso, desde encontrar videos hasta generar tus propios guiones optimizados."
              }].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="card-landing-light border-border data-[state=open]:border-primary/30 transition-colors px-6">
                  <AccordionTrigger className="hover:text-primary py-4 text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-8 md:p-16 text-center border-0 bg-gradient-to-r from-primary/10 to-accent/10">
            <Zap className="h-12 w-12 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Listo para vender más en TikTok Shop?
            </h2>
            <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
              Únete a los creadores que están aumentando sus ventas con datos reales y scripts probados.
            </p>
            <Button size="lg" className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl bg-primary hover:bg-primary-hover btn-glow" onClick={handleCTA}>
              Empieza ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-2">
                <img src={logoDark} alt="Adbroll" className="h-10 mb-4" />
                <p className="text-muted-foreground text-sm mb-4">
                  La herramienta definitiva para creadores de TikTok Shop.
                </p>
                <Button onClick={handleCTA} className="bg-primary hover:bg-primary-hover">
                  Empieza ahora
                </Button>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Términos y Condiciones</a></li>
                  <li><a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Política de Privacidad</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Soporte</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/support" className="text-muted-foreground hover:text-foreground transition-colors">Centro de Ayuda</a></li>
                  <li><a href="mailto:contacto@adbroll.com" className="text-muted-foreground hover:text-foreground transition-colors">contacto@adbroll.com</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 Adbroll. Todos los derechos reservados.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="mobile-sticky-cta">
        <Button className="w-full bg-primary hover:bg-primary-hover text-lg py-6" onClick={handleCTA}>
          Empieza ahora
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Pricing Modal */}
      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />

      {/* Email Capture Modal */}
      <EmailCaptureModal open={emailModalOpen} onOpenChange={setEmailModalOpen} referralCode={refCode} />
    </div>
  );
};

export default Landing;
