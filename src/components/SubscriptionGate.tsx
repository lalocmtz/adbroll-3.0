import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate = ({ children }: SubscriptionGateProps) => {
  const { hasActiveSubscription, loading } = useSubscription();
  const navigate = useNavigate();
  const [showBlockedMessage, setShowBlockedMessage] = useState(false);

  useEffect(() => {
    if (!loading && !hasActiveSubscription) {
      setShowBlockedMessage(true);
    }
  }, [loading, hasActiveSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (showBlockedMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Suscripción Requerida</CardTitle>
            <CardDescription>
              Necesitas una suscripción activa para acceder a adbroll Premium
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-6 text-center">
              <p className="text-3xl font-bold mb-2">$49 USD</p>
              <p className="text-sm text-muted-foreground">por mes</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Incluye:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Acceso ilimitado a videos top 20 diarios</li>
                <li>✓ Transcripciones y guiones IA</li>
                <li>✓ Análisis de productos y creadores</li>
                <li>✓ Identificación de oportunidades</li>
                <li>✓ Sistema de favoritos</li>
              </ul>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                // TODO: Integrar Stripe Checkout cuando esté disponible
                alert("La integración con Stripe estará disponible próximamente");
              }}
            >
              Suscribirse Ahora
            </Button>

            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
