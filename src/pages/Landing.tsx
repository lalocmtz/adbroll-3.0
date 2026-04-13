import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, FileText, Trophy, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlobalHeader from "@/components/GlobalHeader";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <GlobalHeader showMenu={false} />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            <Sparkles className="h-3 w-3 mr-1 inline" />
            Datos en tiempo real de TikTok Shop
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-balance leading-tight">
            Descubre qué videos están vendiendo{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HOY
            </span>
            {" "}en TikTok Shop
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Guiones reales. Datos reales. Todo ya listo para usar y convertir.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/register")}
            >
              Crear cuenta gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => navigate("/login")}
            >
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-foreground">20+</p>
              <p className="text-sm md:text-base text-muted-foreground">Videos diarios</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-foreground">100%</p>
              <p className="text-sm md:text-base text-muted-foreground">Datos verificados</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-foreground">IA</p>
              <p className="text-sm md:text-base text-muted-foreground">Guiones optimizados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para vender más
            </h2>
            <p className="text-lg text-muted-foreground">
              Analiza, aprende y aplica las estrategias que funcionan
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <Card className="card-premium p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Datos reales de Kalodata
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Métricas verificadas de los videos que realmente están generando ventas en TikTok Shop
              </p>
            </Card>

            <Card className="card-premium p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Guiones transcritos y reescritos por IA
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Cada video incluye transcripción automática y versión optimizada lista para adaptar
              </p>
            </Card>

            <Card className="card-premium p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                Top 20 videos con mayores ingresos
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Solo los creativos más rentables, actualizados cada día
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cómo funciona
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple, rápido y efectivo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Explora el Top 20</h3>
              <p className="text-muted-foreground text-sm">
                Descubre los videos más rentables del día
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Analiza los guiones</h3>
              <p className="text-muted-foreground text-sm">
                Lee las transcripciones y versiones optimizadas por IA
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Adapta y vende</h3>
              <p className="text-muted-foreground text-sm">
                Personaliza para tu producto y empieza a vender
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots/Mockup Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <Card className="card-premium p-8 md:p-12 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="text-xl font-semibold text-muted-foreground">
                  Preview del Dashboard
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Interfaz intuitiva con métricas en tiempo real, filtros avanzados y análisis detallado
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="max-w-4xl mx-auto p-8 md:p-16 text-center bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 shadow-2xl">
          <Zap className="h-12 w-12 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comienza a analizar los mejores guiones hoy
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Únete a los creadores que están aumentando sus ventas con datos reales
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl"
            onClick={() => navigate("/register")}
          >
            Crear cuenta gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  adbroll
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Datos reales para creadores reales
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                &copy; 2025 adbroll. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
