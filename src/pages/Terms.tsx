import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const { language } = useLanguage();

  const content = {
    es: {
      title: "Términos y Condiciones",
      lastUpdated: "Última actualización: 2025",
      backButton: "Volver al inicio",
      intro: "Adbroll es un servicio de suscripción operado por Ecom Genius LLC. Al utilizar esta plataforma, aceptas los siguientes términos:",
      sections: [
        {
          title: "1. Acceso y uso",
          content: `El acceso a Adbroll requiere una suscripción activa. Su uso es personal y no transferible.`
        },
        {
          title: "2. Renovación automática",
          content: `Las suscripciones se renuevan automáticamente cada mes, a menos que el usuario las cancele. Puedes cancelar en cualquier momento desde tu cuenta.`
        },
        {
          title: "3. Pagos",
          content: `Procesamos pagos exclusivamente a través de Stripe. Los cargos aparecerán como "ADBROLL.COM".`
        },
        {
          title: "4. Reembolsos",
          content: `Consulta nuestra política de reembolsos en: https://adbroll.com/refund-policy`
        },
        {
          title: "5. Limitación de responsabilidad",
          content: `Adbroll provee datos informativos, sin garantizar resultados comerciales.`
        },
        {
          title: "6. Cancelación",
          content: `Puedes cancelar tu suscripción en cualquier momento; el acceso seguirá activo hasta el final del periodo pagado.`
        },
        {
          title: "7. Identidad de la empresa",
          content: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States
contacto@adbroll.com`
        }
      ]
    },
    en: {
      title: "Terms and Conditions",
      lastUpdated: "Last updated: 2025",
      backButton: "Back to home",
      intro: "Adbroll is a subscription service operated by Ecom Genius LLC. By using this platform, you accept the following terms:",
      sections: [
        {
          title: "1. Access and use",
          content: `Access to Adbroll requires an active subscription. Its use is personal and non-transferable.`
        },
        {
          title: "2. Automatic renewal",
          content: `Subscriptions renew automatically every month, unless the user cancels them. You can cancel at any time from your account.`
        },
        {
          title: "3. Payments",
          content: `We process payments exclusively through Stripe. Charges will appear as "ADBROLL.COM".`
        },
        {
          title: "4. Refunds",
          content: `Please see our refund policy at: https://adbroll.com/refund-policy`
        },
        {
          title: "5. Limitation of liability",
          content: `Adbroll provides informational data, without guaranteeing commercial results.`
        },
        {
          title: "6. Cancellation",
          content: `You can cancel your subscription at any time; access will remain active until the end of the paid period.`
        },
        {
          title: "7. Company identity",
          content: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States
contacto@adbroll.com`
        }
      ]
    }
  };

  const data = content[language];

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
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-muted-foreground">{data.lastUpdated}</p>
        </div>

        <p className="text-muted-foreground text-center mb-8 text-lg">
          {data.intro}
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

export default Terms;
