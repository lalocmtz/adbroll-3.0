import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  ArrowRight,
  Play,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  Lock,
  Eye,
  Zap,
  Star,
  Check,
  X,
  Gift,
  Shield,
  Brain,
  Coins,
  BarChart3,
  Wand2,
  Search,
  Target,
  ChevronRight,
  Users,
  MousePointer,
} from "lucide-react";
import PricingModal from "@/components/PricingModal";
import { AnimatedMarqueeHero } from "@/components/ui/hero-3";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { FeatureSteps } from "@/components/ui/feature-section";
import { supabase } from "@/integrations/supabase/client";

// Import mockups
import mockupDashboard from "@/assets/mockup-dashboard.png";
import mockupScriptAnalysis from "@/assets/mockup-script-analysis.png";
import mockupOpportunities from "@/assets/mockup-opportunities.png";

// Import step images
import step1Dashboard from "@/assets/step-1-dashboard.png";
import step2Analysis from "@/assets/step-2-analysis.png";
import step3Variants from "@/assets/step-3-variants.png";

const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  // No longer need to fetch video thumbnails - using static hero cards

  const handleRegister = () => {
    navigate("/register" + (refCode ? `?ref=${refCode}` : ""));
  };

  const handlePreviewClick = () => {
    navigate("/register" + (refCode ? `?ref=${refCode}` : ""));
  };

  return (
    <div className="min-h-screen landing-light text-foreground overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-2xl font-bold">
            <span className="text-gradient">adbroll</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/login")}>
              Iniciar sesión
            </Button>
            <Button onClick={handleRegister} className="bg-primary hover:bg-primary-hover btn-glow">
              Empieza Gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Animated Marquee */}
      <AnimatedMarqueeHero
        tagline="🔥 +10,000 creadores ya usan AdBroll"
        title={
          <>
            De creador improvisado a{" "}
            <TextShimmer duration={2.5} spread={3} className="text-gradient font-bold">
              vendedor estratégico
            </TextShimmer>{" "}
            en <TypingAnimation text="TikTok Shop" duration={120} className="whitespace-nowrap" />
          </>
        }
        description="Encuentra productos virales, copia guiones que venden y gana dinero creando. Todo con IA."
        ctaText="Empezar gratis"
        ctaSecondaryText="Ver cómo funciona"
        onCtaClick={handleRegister}
        onCtaSecondaryClick={() => {
          const howItWorks = document.getElementById('how-it-works');
          howItWorks?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* How it Works */}
      <section id="how-it-works" className="py-16 md:py-24 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="badge-landing-light mb-4">Cómo funciona</Badge>
          </div>
          
          <FeatureSteps
            features={[
              {
                step: "1",
                title: "Qué está funcionando hoy",
                content: "Ve los videos con más ventas y productos conectados.",
                image: step1Dashboard,
              },
              {
                step: "2",
                title: "Toma el guion viral y adáptalo",
                content: "Nuestra IA te lo da listo para grabar.",
                image: step2Analysis,
              },
              {
                step: "3",
                title: "Graba. Publica. Cobra.",
                content: "Monetiza como creador desde el día uno.",
                image: step3Variants,
              },
            ]}
            title="Convierte ideas en ingresos en 3 pasos"
            subtitle="De la inspiración a tu primer dólar con IA, sin grabar al azar ni perder tiempo."
            autoPlayInterval={4000}
            className="py-0"
          />

          <div className="text-center mt-8">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary-hover btn-glow"
              onClick={handleRegister}
            >
              Empieza Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Preview (Paywall) */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Vista previa</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Descubre lo que te espera dentro
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Haz clic para desbloquear acceso completo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: TrendingUp,
                title: "Videos que están vendiendo hoy",
                description: "Top 100 videos con mayores ingresos en TikTok Shop",
                blurred: true,
              },
              {
                icon: FileText,
                title: "Extractor de Scripts con IA",
                description: "Transcribe y analiza cualquier video automáticamente",
                blurred: false,
              },
              {
                icon: Target,
                title: "Oportunidades de Productos",
                description: "Productos con alta comisión y baja competencia",
                blurred: true,
              },
            ].map((item, index) => (
              <button
                key={index}
                onClick={handlePreviewClick}
                className="group relative text-left"
              >
                <Card className="card-landing-light h-full overflow-hidden">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="feature-icon-container flex-shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                  </div>
                  
                  {/* Blurred content placeholder */}
                  <div className={`mt-4 space-y-2 ${item.blurred ? 'blur-paywall' : ''}`}>
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                    <div className="h-3 bg-muted rounded w-3/5" />
                    <div className="h-8 bg-muted/50 rounded mt-4" />
                  </div>

                  {/* Unlock overlay */}
                  {item.blurred && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                        <Lock className="h-4 w-4" />
                        Desbloquear
                      </span>
                    </div>
                  )}
                </Card>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Beneficios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por qué AdBroll cambia el juego
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Target,
                title: "Contenido que vende",
                description: "Replica estructuras probadas en lugar de adivinar. Aprende de los videos que ya están generando ventas.",
              },
              {
                icon: DollarSign,
                title: "Comisiones más altas",
                description: "Te mostramos cuánto puedes ganar por cada venta. Elige productos con el mejor ROI.",
              },
              {
                icon: Clock,
                title: "Ahorra horas de trabajo",
                description: "Scripts automáticos, análisis y tendencias listas para usar. De 0 a contenido en minutos.",
              },
            ].map((item, index) => (
              <Card key={index} className="card-landing-light">
                <div className="feature-icon-container mb-6">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Tour */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Dentro de AdBroll</Badge>
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
                  Extrae y analiza guiones en segundos
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nuestra IA transcribe el audio, identifica la estructura (Hook, Cuerpo, CTA) y te muestra exactamente qué hace que cada video venda.
                </p>
                <ul className="space-y-3 mb-6">
                  {["Transcripción automática con IA", "Análisis de estructura del script", "Identificación de patrones de venta", "Generación de variantes optimizadas"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleRegister} className="bg-primary hover:bg-primary-hover btn-glow">
                  Probar ahora
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
                  <img 
                    src={mockupScriptAnalysis} 
                    alt="Análisis de Scripts con IA" 
                    className="w-full"
                  />
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
                  <img 
                    src={mockupOpportunities} 
                    alt="Oportunidades de Productos" 
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <Badge className="badge-landing-light mb-4">Oportunidades</Badge>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Encuentra productos con alta comisión y baja competencia
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nuestro algoritmo analiza comisiones, ventas y competencia para mostrarte las mejores oportunidades de mercado.
                </p>
                <ul className="space-y-3 mb-6">
                  {["Índice de oportunidad calculado con IA", "Comisiones del 15-30% por venta", "Productos con menos de 50 creadores activos", "Ganancias estimadas por cada venta"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleRegister} className="bg-primary hover:bg-primary-hover btn-glow">
                  Ver oportunidades
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-32 landing-section-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Testimonios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Lo que dicen los creadores
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "Dejé de grabar videos a ciegas. Ahora sé qué funciona.",
                author: "Carlos M.",
                role: "Creador TikTok Shop",
              },
              {
                quote: "Mis ventas crecieron gracias a las oportunidades de alto payout.",
                author: "María L.",
                role: "Afiliada",
              },
              {
                quote: "Vale cada peso. Me ahorra horas y aumenta mi conversión.",
                author: "Diego R.",
                role: "Content Creator",
              },
            ].map((item, index) => (
              <Card key={index} className="card-landing-light">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{item.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {item.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.author}</p>
                    <p className="text-muted-foreground text-xs">{item.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="badge-landing-light mb-4">Planes</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Elige tu plan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Si vienes con código de referido, obtienes <span className="text-primary font-semibold">50% OFF</span> tu primer mes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "FREE",
                price: 0,
                description: "Perfecto para explorar",
                features: [
                  { text: "Feed limitado", included: true },
                  { text: "Scripts limitados", included: true },
                  { text: "Oportunidades bloqueadas", included: false },
                  { text: "Variantes IA", included: false },
                  { text: "Análisis IA", included: false },
                ],
                cta: "Empieza",
                highlighted: false,
              },
              {
                name: "CREATOR",
                price: 29,
                description: "Para creadores que escalan",
                badge: "Más popular",
                features: [
                  { text: "Todo lo del free", included: true },
                  { text: "Scripts ilimitados", included: true },
                  { text: "Variantes IA", included: true },
                  { text: "Oportunidades parciales", included: true },
                  { text: "Panel de afiliados", included: true },
                ],
                cta: "Elegir plan",
                highlighted: true,
              },
              {
                name: "STUDIO",
                price: 49,
                description: "Para equipos y agencias",
                badge: "Más completo",
                features: [
                  { text: "Todo ilimitado", included: true },
                  { text: "Datos completos", included: true },
                  { text: "Oportunidades pro", included: true },
                  { text: "Prioridad en análisis", included: true },
                  { text: "Soporte premium", included: true },
                ],
                cta: "Elegir plan",
                highlighted: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`relative p-6 flex flex-col transition-all duration-300 ${
                  plan.highlighted
                    ? "card-landing-light-featured md:scale-105"
                    : "card-landing-light"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
                    <Star className="h-3 w-3 mr-1" />
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      {plan.price === 0 ? "Gratis" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-muted-foreground">/mes</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground/60"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-primary hover:bg-primary-hover"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                  onClick={handleRegister}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
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
              {[
                {
                  question: "¿Qué tan precisos son los datos?",
                  answer: "Nuestros datos provienen directamente de Kalodata, la fuente más confiable para métricas de TikTok Shop. Actualizamos los rankings y videos diariamente para darte información real y actualizada.",
                },
                {
                  question: "¿Qué incluye el plan gratuito?",
                  answer: "El plan gratuito te da acceso limitado al feed de videos, extracción de 1 script por día, y una vista previa de las oportunidades. Es perfecto para probar la plataforma antes de comprometerte.",
                },
                {
                  question: "¿Puedo ganar dinero recomendando AdBroll?",
                  answer: "¡Sí! Con nuestro programa de afiliados ganas el 30% de comisión recurrente por cada usuario que se suscriba con tu código. Puedes generar tu código desde el panel de configuración.",
                },
                {
                  question: "¿Funciona para México y USA?",
                  answer: "Actualmente nos enfocamos en TikTok Shop México con datos en MXN. Pronto expandiremos a USA y otros mercados.",
                },
                {
                  question: "¿Puedo cancelar cuando quiera?",
                  answer: "Absolutamente. No hay contratos ni compromisos a largo plazo. Puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración.",
                },
                {
                  question: "¿Necesito experiencia previa?",
                  answer: "No. AdBroll está diseñado tanto para creadores nuevos como experimentados. La IA te guía en cada paso, desde encontrar videos hasta generar tus propios guiones optimizados.",
                },
              ].map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="card-landing-light border-border data-[state=open]:border-primary/30 transition-colors px-6"
                >
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
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl bg-primary hover:bg-primary-hover btn-glow"
              onClick={handleRegister}
            >
              Empieza Gratis
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
                <h3 className="text-2xl font-bold text-gradient mb-2">adbroll</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  La herramienta definitiva para creadores de TikTok Shop.
                </p>
                <Button onClick={handleRegister} className="bg-primary hover:bg-primary-hover">
                  Empieza Gratis
                </Button>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => navigate("/terms")} className="text-muted-foreground hover:text-foreground transition-colors">Términos y Condiciones</button></li>
                  <li><button onClick={() => navigate("/privacy")} className="text-muted-foreground hover:text-foreground transition-colors">Política de Privacidad</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Soporte</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => navigate("/support")} className="text-muted-foreground hover:text-foreground transition-colors">Centro de Ayuda</button></li>
                  <li><a href="mailto:contacto@adbroll.com" className="text-muted-foreground hover:text-foreground transition-colors">contacto@adbroll.com</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 adbroll. Todos los derechos reservados.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="mobile-sticky-cta">
        <Button 
          className="w-full bg-primary hover:bg-primary-hover text-lg py-6" 
          onClick={handleRegister}
        >
          Empieza Gratis
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Pricing Modal */}
      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
};

export default Landing;
