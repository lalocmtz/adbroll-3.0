import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/app");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const content = {
    es: {
      title: "¡Pago exitoso!",
      subtitle: "Tu suscripción a Adbroll Pro está activa",
      description: "Ahora tienes acceso completo a todas las herramientas de análisis, guiones IA y oportunidades de productos.",
      redirect: `Redirigiendo al dashboard en ${countdown} segundos...`,
      button: "Ir al Dashboard ahora",
    },
    en: {
      title: "Payment successful!",
      subtitle: "Your Adbroll Pro subscription is active",
      description: "You now have full access to all analytics tools, AI scripts, and product opportunities.",
      redirect: `Redirecting to dashboard in ${countdown} seconds...`,
      button: "Go to Dashboard now",
    },
  };

  const t = content[language as keyof typeof content] || content.es;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <p className="text-lg font-medium text-primary">{t.subtitle}</p>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t.redirect}</span>
        </div>

        <Button 
          onClick={() => navigate("/app")} 
          className="w-full"
          size="lg"
        >
          {t.button}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
