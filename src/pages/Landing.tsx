import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BarChart3, FileText, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={() => navigate("/login")}>
            Iniciar sesión
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Descubre qué videos están vendiendo{" "}
            <span className="text-primary">HOY</span> en TikTok Shop
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Guiones reales. Datos reales. Todo ya listo para usar.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 transition-all"
            onClick={() => navigate("/register")}
          >
            Entrar al panel de análisis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-8 text-center border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Datos reales de Kalodata
            </h3>
            <p className="text-muted-foreground">
              Métricas verificadas de los videos que realmente están generando ventas en TikTok Shop
            </p>
          </Card>

          <Card className="p-8 text-center border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Guiones transcritos y reescritos por IA
            </h3>
            <p className="text-muted-foreground">
              Cada video incluye transcripción automática y versión optimizada lista para adaptar
            </p>
          </Card>

          <Card className="p-8 text-center border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Top 20 videos con mayores ingresos diarios
            </h3>
            <p className="text-muted-foreground">
              Solo los creativos más rentables, actualizados cada día
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto p-12 text-center bg-primary text-primary-foreground border-0">
          <h3 className="text-3xl font-bold mb-4">
            Comienza a analizar los mejores guiones hoy
          </h3>
          <p className="text-lg mb-8 opacity-90">
            Únete a los creadores que están aumentando sus ventas con datos reales
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => navigate("/register")}
          >
            Crear cuenta gratuita
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 adbroll. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
