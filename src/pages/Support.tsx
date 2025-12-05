import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";

const Support = () => {
  const { language } = useLanguage();

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {language === "es" ? "Soporte" : "Support"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {language === "es"
            ? "¿Necesitas ayuda? Estamos aquí para ti"
            : "Need help? We're here for you"}
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6 text-center">
          <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {language === "es" ? "Centro de Soporte" : "Support Center"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {language === "es"
              ? "Nuestro centro de soporte está en construcción. Mientras tanto, puedes contactarnos por email."
              : "Our support center is under construction. In the meantime, you can contact us via email."}
          </p>
          <Button asChild>
            <a href="mailto:contacto@adbroll.com">
              <Mail className="h-4 w-4 mr-2" />
              contacto@adbroll.com
            </a>
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">
            {language === "es" ? "Preguntas frecuentes" : "Frequently Asked Questions"}
          </h3>
          <ul className="space-y-3">
            <li>
              <a href="/faq" className="text-primary hover:underline text-sm">
                {language === "es" ? "→ Ver todas las preguntas frecuentes" : "→ View all FAQ"}
              </a>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Support;
