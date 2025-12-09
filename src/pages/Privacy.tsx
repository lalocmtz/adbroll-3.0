import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  const { language } = useLanguage();

  const content = {
    es: {
      title: "Política de Privacidad",
      lastUpdated: "Última actualización: 2025",
      backButton: "Volver al inicio",
      intro: "Adbroll, operado por **Ecom Genius LLC**, respeta tu privacidad y está comprometido con proteger tu información personal.",
      sections: [
        {
          title: "Información que recopilamos",
          content: `• Datos de registro (correo electrónico, nombre).
• Información de pago procesada de forma segura por Stripe. Nosotros no almacenamos números de tarjeta.
• Información sobre uso de la plataforma (páginas vistas, funciones utilizadas).`
        },
        {
          title: "Cómo usamos tu información",
          content: `• Para proveer acceso a la plataforma.
• Para procesar pagos y suscripciones.
• Para enviar notificaciones relacionadas con tu cuenta.
• Para mejorar funciones y seguridad del servicio.`
        },
        {
          title: "Compartición de datos",
          content: `• Stripe, nuestro procesador de pagos.
• Proveedores de hosting y seguridad.
• Nunca vendemos datos a terceros.`
        },
        {
          title: "Retención de datos",
          content: `Conservamos la información mientras la cuenta esté activa o según lo exija la ley.`
        },
        {
          title: "Tus derechos",
          content: `Puedes solicitar eliminación de tu cuenta escribiendo a contacto@adbroll.com`
        },
        {
          title: "Información de la empresa",
          content: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States
Correo: contacto@adbroll.com`
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: 2025",
      backButton: "Back to home",
      intro: "Adbroll, operated by **Ecom Genius LLC**, respects your privacy and is committed to protecting your personal information.",
      sections: [
        {
          title: "Information we collect",
          content: `• Registration data (email, name).
• Payment information processed securely by Stripe. We do not store card numbers.
• Information about platform usage (pages viewed, features used).`
        },
        {
          title: "How we use your information",
          content: `• To provide access to the platform.
• To process payments and subscriptions.
• To send notifications related to your account.
• To improve features and service security.`
        },
        {
          title: "Data sharing",
          content: `• Stripe, our payment processor.
• Hosting and security providers.
• We never sell data to third parties.`
        },
        {
          title: "Data retention",
          content: `We retain information while the account is active or as required by law.`
        },
        {
          title: "Your rights",
          content: `You can request account deletion by writing to contacto@adbroll.com`
        },
        {
          title: "Company information",
          content: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States
Email: contacto@adbroll.com`
        }
      ]
    }
  };

  const data = content[language];

  // Helper to render bold text
  const renderText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => 
      index % 2 === 1 ? <strong key={index}>{part}</strong> : part
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader showMenu={false} />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {data.backButton}
          </Button>
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-muted-foreground">{data.lastUpdated}</p>
        </div>

        <p className="text-muted-foreground text-center mb-8 text-lg">
          {renderText(data.intro)}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          {data.sections.map((section, index) => (
            <section key={index} className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-foreground">{section.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
