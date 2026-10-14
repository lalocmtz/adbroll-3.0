import { BrandLogo } from "@/components/brand/BrandLogo";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const CheckoutCancel = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const content = {
    es: {
      title: "No completaste el pago",
      subtitle: "Puedes seguir explorando la vista previa",
      description: "Tu cuenta gratuita sigue disponible. Si quieres activar Pro, vuelve al plan. Si ya ves un cargo en tu banco, revisa tu cuenta o contacta a soporte antes de pagar de nuevo.",
      tryAgain: "Volver al plan Pro",
      goBack: "Explorar la vista previa",
    },
    en: {
      title: "Checkout was not completed",
      subtitle: "You can keep exploring the preview",
      description: "Your free account is still available. Return to the plan when you want to activate Pro. If your bank already shows a charge, check your account or contact support before paying again.",
      tryAgain: "Back to the Pro plan",
      goBack: "Explore the preview",
    },
  };

  const t = content[language as keyof typeof content] || content.es;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <BrandLogo tone="dark" size="lg" />
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <p className="text-lg font-medium text-muted-foreground">{t.subtitle}</p>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => navigate("/pricing")} 
            className="w-full"
            size="lg"
          >
            {t.tryAgain}
          </Button>
          <Button 
            onClick={() => navigate("/app")} 
            variant="outline"
            className="w-full"
            size="lg"
          >
            {t.goBack}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
