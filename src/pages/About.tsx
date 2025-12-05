import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Video, Users, Sparkles, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const content = {
    es: {
      title: "Sobre Adbroll",
      subtitle: "La plataforma de analytics para creadores de TikTok Shop México",
      mission: "Nuestra Misión",
      missionText: "Descubre qué videos están vendiendo HOY en TikTok Shop. Ayudamos a creadores a encontrar inspiración basada en datos reales, no en suposiciones.",
      features: [
        {
          icon: Video,
          title: "Top 100 Videos",
          description: "Accede a los videos más vendedores de TikTok Shop México, con métricas reales de ingresos, ventas y visualizaciones."
        },
        {
          icon: TrendingUp,
          title: "Productos Rentables",
          description: "Descubre qué productos están generando más comisiones para creadores en los últimos 30 días."
        },
        {
          icon: Users,
          title: "Creadores Exitosos",
          description: "Analiza a los Top 50 creadores con mejor rendimiento y aprende de sus estrategias."
        },
        {
          icon: Sparkles,
          title: "Transcripción con IA",
          description: "Extrae automáticamente el guión de cualquier video usando inteligencia artificial."
        },
        {
          icon: Target,
          title: "Análisis de Scripts",
          description: "Identifica la estructura de Hook, Cuerpo y CTA de videos exitosos para replicarlos."
        },
        {
          icon: Zap,
          title: "Variantes IA",
          description: "Genera versiones alternativas de guiones exitosos adaptadas a tu estilo."
        }
      ],
      cta: "Comenzar ahora",
      dataSource: "¿De dónde vienen los datos?",
      dataSourceText: "Importamos y procesamos datos de Kalodata diariamente, una de las herramientas de análisis más confiables para TikTok Shop. Esto nos permite brindarte información actualizada y precisa del mercado mexicano."
    },
    en: {
      title: "About Adbroll",
      subtitle: "The analytics platform for TikTok Shop Mexico creators",
      mission: "Our Mission",
      missionText: "Discover what videos are selling TODAY on TikTok Shop. We help creators find inspiration based on real data, not assumptions.",
      features: [
        {
          icon: Video,
          title: "Top 100 Videos",
          description: "Access the best-selling videos on TikTok Shop Mexico, with real metrics for revenue, sales, and views."
        },
        {
          icon: TrendingUp,
          title: "Profitable Products",
          description: "Discover which products are generating the most commissions for creators in the last 30 days."
        },
        {
          icon: Users,
          title: "Successful Creators",
          description: "Analyze the Top 50 best-performing creators and learn from their strategies."
        },
        {
          icon: Sparkles,
          title: "AI Transcription",
          description: "Automatically extract the script from any video using artificial intelligence."
        },
        {
          icon: Target,
          title: "Script Analysis",
          description: "Identify the Hook, Body, and CTA structure of successful videos to replicate them."
        },
        {
          icon: Zap,
          title: "AI Variants",
          description: "Generate alternative versions of successful scripts adapted to your style."
        }
      ],
      cta: "Get started",
      dataSource: "Where does the data come from?",
      dataSourceText: "We import and process data from Kalodata daily, one of the most reliable analytics tools for TikTok Shop. This allows us to provide you with updated and accurate information from the Mexican market."
    }
  };

  const data = content[language];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader showMenu={false} />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 md:px-6 py-16 max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {data.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {data.subtitle}
          </p>
          <Button size="lg" onClick={() => navigate("/register")}>
            {data.cta}
          </Button>
        </section>

        {/* Mission */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{data.mission}</h2>
            <p className="text-lg text-muted-foreground">{data.missionText}</p>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 md:px-6 py-16 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Data Source */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{data.dataSource}</h2>
            <p className="text-muted-foreground">{data.dataSourceText}</p>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 md:px-6 py-16 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {language === "es" ? "¿Listo para empezar?" : "Ready to get started?"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {language === "es" 
              ? "Únete a los creadores que ya están usando Adbroll para encontrar su próximo video viral."
              : "Join the creators who are already using Adbroll to find their next viral video."
            }
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/register")}>
              {data.cta}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/faq")}>
              {language === "es" ? "Ver FAQ" : "View FAQ"}
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
