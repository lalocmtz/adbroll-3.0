import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountType } from "@/hooks/useAccountType";
import { 
  Check, 
  Megaphone, 
  Users, 
  BarChart3, 
  Zap,
  Crown,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "Gratis",
    description: "Para marcas que están comenzando",
    features: [
      "1 campaña activa",
      "Hasta 10 envíos por campaña",
      "Acceso a creadores básico",
      "Soporte por email",
    ],
    limitations: [
      "Sin analytics avanzados",
      "Sin prioridad en matching",
    ],
    cta: "Plan actual",
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 2999,
    period: "/mes",
    description: "Para marcas en crecimiento",
    features: [
      "5 campañas activas",
      "Hasta 50 envíos por campaña",
      "Acceso completo a creadores",
      "Analytics de rendimiento",
      "Soporte prioritario",
      "Matching con IA",
    ],
    cta: "Comenzar Growth",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9999,
    period: "/mes",
    description: "Para marcas establecidas",
    features: [
      "Campañas ilimitadas",
      "Envíos ilimitados",
      "Creadores exclusivos",
      "Analytics avanzados + API",
      "Account manager dedicado",
      "Matching premium con IA",
      "Integraciones personalizadas",
    ],
    cta: "Contactar ventas",
    popular: false,
  },
];

const BrandUpgrade = () => {
  const navigate = useNavigate();
  const { isBrand, brandProfile, isLoading: accountLoading } = useAccountType();

  useEffect(() => {
    if (!accountLoading && !isBrand) {
      navigate("/app");
    }
  }, [accountLoading, isBrand, navigate]);

  const handleSelectPlan = (planId: string) => {
    if (planId === "starter") {
      toast.info("Ya tienes el plan Starter");
      return;
    }
    if (planId === "enterprise") {
      window.open("mailto:marcas@adbroll.com?subject=Plan Enterprise", "_blank");
      return;
    }
    // For Growth plan, would integrate with Stripe
    toast.info("Próximamente: Integración de pagos para marcas");
  };

  if (accountLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isBrand) return null;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="mb-2">
          <Crown className="h-3 w-3 mr-1" />
          Planes para Marcas
        </Badge>
        <h1 className="text-3xl font-bold">Escala tu estrategia de UGC</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Conecta con los mejores creadores de TikTok Shop México y obtén contenido 
          auténtico que convierte.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Más popular
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">
                  {plan.price === 0 ? "Gratis" : `$${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground text-sm"> MXN{plan.period}</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              {plan.limitations && (
                <ul className="space-y-2 pt-2 border-t">
                  {plan.limitations.map((limitation, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-red-400">✗</span>
                      {limitation}
                    </li>
                  ))}
                </ul>
              )}

              <Button 
                className={`w-full ${plan.popular ? "" : "variant-outline"}`}
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={plan.id === "starter"}
              >
                {plan.cta}
                {plan.id !== "starter" && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Section */}
      <div className="pt-8">
        <h2 className="text-xl font-bold text-center mb-6">
          ¿Por qué las marcas eligen Adbroll?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Creadores Verificados</h3>
              <p className="text-sm text-muted-foreground">
                Acceso a creadores con historial de ventas probado en TikTok Shop México.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Matching con IA</h3>
              <p className="text-sm text-muted-foreground">
                Nuestro algoritmo conecta tu producto con los creadores más relevantes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Analytics Completos</h3>
              <p className="text-sm text-muted-foreground">
                Mide el rendimiento de tus campañas y optimiza tu inversión en UGC.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <p className="text-muted-foreground text-sm">
          ¿Tienes preguntas? {" "}
          <a href="mailto:marcas@adbroll.com" className="text-primary hover:underline">
            Contacta con nuestro equipo
          </a>
        </p>
      </div>
    </div>
  );
};

export default BrandUpgrade;
