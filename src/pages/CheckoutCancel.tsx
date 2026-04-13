import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const CheckoutCancel = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const content = {
    es: {
      title: "Pago cancelado",
      subtitle: "No te preocupes, no se realizó ningún cargo",
      description: "Si tuviste algún problema durante el proceso de pago, puedes intentarlo de nuevo o contactarnos para ayudarte.",
      tryAgain: "Intentar de nuevo",
      goBack: "Volver al inicio",
    },
    en: {
      title: "Payment cancelled",
      subtitle: "Don't worry, no charges were made",
      description: "If you had any issues during checkout, you can try again or contact us for help.",
      tryAgain: "Try again",
      goBack: "Go back home",
    },
  };

  const t = content[language as keyof typeof content] || content.es;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
          <XCircle className="w-10 h-10 text-amber-600" />
        </div>
        
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
