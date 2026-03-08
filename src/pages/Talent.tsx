import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  DollarSign, 
  Gift, 
  BadgeCheck, 
  UserPlus, 
  Megaphone, 
  Sparkles, 
  ClipboardList,
  Banknote,
  ShieldCheck,
  CalendarCheck,
  FileText,
  Briefcase,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CreatorApplicationForm from "@/components/creators/CreatorApplicationForm";
import CampaignsTab from "@/components/creators/CampaignsTab";
import CreatorDirectory from "@/components/creators/CreatorDirectory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";

const MOCK_CAMPAIGNS = [
  {
    brand: "Glow Skin",
    product: "Crema facial viral",
    payment: "$120",
    requirement: "Video 30-60s",
    emoji: "✨",
  },
  {
    brand: "FitPro MX",
    product: "Banda de resistencia premium",
    payment: "$85",
    requirement: "Review honesto",
    emoji: "💪",
  },
  {
    brand: "TechStyle",
    product: "Audífonos inalámbricos",
    payment: "$150",
    requirement: "Unboxing + review",
    emoji: "🎧",
  },
];

const Talent = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("aplicar");
  const formRef = useRef<HTMLDivElement>(null);
  const campaignsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "aplicar") {
      setActiveTab("aplicar");
    } else if (tab === "creadores") {
      setActiveTab("creadores");
    } else if (tab === "campanas") {
      setActiveTab("campanas");
    }
  }, [searchParams]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab("aplicar");
  };

  const scrollToCampaigns = () => {
    campaignsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab("campanas");
  };

  const isEs = language === "es";

  return (
    <div className="pb-24 md:pb-6">
      {/* ─── HERO SECTION ─── */}
      <section className="px-4 md:px-6 pt-8 md:pt-14 pb-10 md:pb-16 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-medium mb-5">
          <Sparkles className="h-3.5 w-3.5" />
          {isEs ? "Programa de Talento adbroll" : "adbroll Talent Program"}
        </div>

        <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight mb-4">
          {isEs
            ? "Gana dinero con campañas de TikTok Shop"
            : "Earn money with TikTok Shop campaigns"}
        </h1>

        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mb-8">
          {isEs
            ? "Conecta con marcas que buscan creadores y recibe campañas pagadas cada semana."
            : "Connect with brands looking for creators and receive paid campaigns every week."}
        </p>

        {/* Bullets */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
          {[
            { icon: Banknote, label: isEs ? "Campañas pagadas" : "Paid campaigns" },
            { icon: Gift, label: isEs ? "Productos gratis" : "Free products" },
            { icon: BadgeCheck, label: isEs ? "Marcas verificadas" : "Verified brands" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-foreground">
              <item.icon className="h-4 w-4 text-primary shrink-0" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={scrollToForm} className="w-full sm:w-auto gap-2">
            <UserPlus className="h-4 w-4" />
            {isEs ? "Aplicar como creador" : "Apply as creator"}
          </Button>
          <Button size="lg" variant="outline" onClick={scrollToCampaigns} className="w-full sm:w-auto gap-2">
            <Megaphone className="h-4 w-4" />
            {isEs ? "Ver campañas" : "View campaigns"}
          </Button>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="px-4 md:px-6 py-10 md:py-16 max-w-4xl mx-auto">
        <h2 className="text-lg md:text-2xl font-bold text-foreground text-center mb-8 md:mb-10">
          {isEs ? "¿Cómo funciona?" : "How does it work?"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              icon: ClipboardList,
              title: isEs ? "Regístrate" : "Sign up",
              desc: isEs ? "Crea tu perfil de creador en menos de 2 minutos" : "Create your creator profile in under 2 minutes",
            },
            {
              step: "2",
              icon: Megaphone,
              title: isEs ? "Recibe campañas" : "Get campaigns",
              desc: isEs ? "Las marcas publican campañas y tú eliges cuáles te interesan" : "Brands post campaigns and you choose which ones interest you",
            },
            {
              step: "3",
              icon: DollarSign,
              title: isEs ? "Gana dinero" : "Earn money",
              desc: isEs ? "Publica contenido, envía tu video y cobra tu pago" : "Publish content, submit your video and get paid",
            },
          ].map((item) => (
            <Card key={item.step} className="text-center border-border/60 bg-card hover:border-primary/30 transition-colors">
              <CardContent className="pt-8 pb-6 px-5">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs font-medium text-primary mb-1.5">
                  {isEs ? `Paso ${item.step}` : `Step ${item.step}`}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── MOCK CAMPAIGN PREVIEW ─── */}
      <section className="px-4 md:px-6 py-10 md:py-16 max-w-4xl mx-auto">
        <h2 className="text-lg md:text-2xl font-bold text-foreground text-center mb-2">
          {isEs ? "Campañas disponibles" : "Available campaigns"}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {isEs ? "Ejemplos de campañas que puedes encontrar" : "Examples of campaigns you can find"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_CAMPAIGNS.map((c) => (
            <Card key={c.brand} className="border-border/60 hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {c.emoji}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.brand}</h3>
                    <p className="text-xs text-muted-foreground">{c.product}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <p className="text-sm font-semibold text-foreground">{c.payment}</p>
                    <p className="text-[11px] text-muted-foreground">{isEs ? "por video" : "per video"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <FileText className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <p className="text-sm font-semibold text-foreground">{c.requirement}</p>
                    <p className="text-[11px] text-muted-foreground">{isEs ? "requisito" : "requirement"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={scrollToForm}>
                  {isEs ? "Aplicar" : "Apply"}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isEs ? "+32 campañas disponibles" : "+32 campaigns available"}
        </p>
        <div className="text-center mt-3">
          <Button variant="ghost" size="sm" onClick={scrollToForm} className="text-primary gap-1">
            {isEs ? "Registrarme para ver todas" : "Register to see all"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      {/* ─── BENEFITS ─── */}
      <section className="px-4 md:px-6 py-10 md:py-16 max-w-3xl mx-auto">
        <h2 className="text-lg md:text-2xl font-bold text-foreground text-center mb-8">
          {isEs ? "Beneficios para creadores" : "Benefits for creators"}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, label: isEs ? "Pagos seguros" : "Secure payments" },
            { icon: CalendarCheck, label: isEs ? "Campañas semanales" : "Weekly campaigns" },
            { icon: FileText, label: isEs ? "Sin contratos largos" : "No long contracts" },
            { icon: Briefcase, label: isEs ? "Trabaja con marcas" : "Work with brands" },
          ].map((b) => (
            <div key={b.label} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card border border-border/60">
              <b.icon className="h-5 w-5 text-primary" />
              <span className="text-xs md:text-sm font-medium text-foreground">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="px-4 md:px-6 py-10 md:py-16 text-center max-w-2xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          {isEs ? "Empieza a ganar con TikTok Shop" : "Start earning with TikTok Shop"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {isEs
            ? "Únete al programa de talento de adbroll y recibe campañas pagadas de marcas verificadas."
            : "Join the adbroll talent program and receive paid campaigns from verified brands."}
        </p>
        <Button size="lg" onClick={scrollToForm} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isEs ? "Aplicar como creador" : "Apply as creator"}
        </Button>
      </section>

      {/* ─── TABS: FORM / CAMPAIGNS / DIRECTORY ─── */}
      <section ref={formRef} className="px-3 md:px-6 pt-6 pb-10 max-w-5xl mx-auto" id="panel">
        <div ref={campaignsRef} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="aplicar" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isEs ? "Soy Creador" : "I'm a Creator"}
              </span>
              <span className="sm:hidden">
                {isEs ? "Aplicar" : "Apply"}
              </span>
            </TabsTrigger>
            <TabsTrigger value="campanas" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span>{isEs ? "Campañas" : "Campaigns"}</span>
            </TabsTrigger>
            <TabsTrigger value="creadores" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{isEs ? "Creadores" : "Creators"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aplicar" className="mt-0">
            <CreatorApplicationForm />
          </TabsContent>

          <TabsContent value="campanas" className="mt-0">
            <CampaignsTab />
          </TabsContent>

          <TabsContent value="creadores" className="mt-0">
            <CreatorDirectory />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Talent;
