import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { RefreshCcw, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const RefundPolicy = () => {
  const { language } = useLanguage();

  const content = {
    es: {
      title: "Política de Reembolsos",
      lastUpdated: "Última actualización: 2025",
      backButton: "Volver al inicio",
      intro: "Debido a la naturaleza digital del servicio, todos los pagos son finales.",
      eligibleTitle: "Sin embargo, ofrecemos reembolsos únicamente en los siguientes casos:",
      eligibleCases: [
        "Cobros duplicados.",
        "Problemas técnicos comprobables que impidan el uso del servicio durante más de 48 horas."
      ],
      noRefundTitle: "No se ofrecen reembolsos por:",
      noRefundCases: [
        "No utilizar el servicio.",
        "Cambio de opinión.",
        "Resultados distintos a los esperados (Adbroll ofrece datos, no resultados garantizados)."
      ],
      howToTitle: "Cómo solicitar un reembolso elegible:",
      howToText: "Escribe a contacto@adbroll.com dentro de los primeros 7 días posteriores al cobro.",
      companyTitle: "Empresa responsable:",
      companyInfo: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States`
    },
    en: {
      title: "Refund Policy",
      lastUpdated: "Last updated: 2025",
      backButton: "Back to home",
      intro: "Due to the digital nature of the service, all payments are final.",
      eligibleTitle: "However, we offer refunds only in the following cases:",
      eligibleCases: [
        "Duplicate charges.",
        "Verifiable technical problems that prevent the use of the service for more than 48 hours."
      ],
      noRefundTitle: "Refunds are not offered for:",
      noRefundCases: [
        "Not using the service.",
        "Change of mind.",
        "Results different from expected (Adbroll provides data, not guaranteed results)."
      ],
      howToTitle: "How to request an eligible refund:",
      howToText: "Write to contacto@adbroll.com within the first 7 days after the charge.",
      companyTitle: "Responsible company:",
      companyInfo: `Ecom Genius LLC
16192 Coastal Highway
Lewes, Delaware 19958, United States`
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
            <RefreshCcw className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-muted-foreground">{data.lastUpdated}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground text-lg text-center">
            {data.intro}
          </p>

          {/* Eligible cases */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">{data.eligibleTitle}</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              {data.eligibleCases.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          {/* No refund cases */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">{data.noRefundTitle}</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              {data.noRefundCases.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          {/* How to request */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">{data.howToTitle}</h2>
            <p className="text-muted-foreground">{data.howToText}</p>
          </section>

          {/* Company info */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-foreground">{data.companyTitle}</h2>
            <p className="text-muted-foreground whitespace-pre-line">{data.companyInfo}</p>
          </section>
        </div>

        {/* Contact CTA */}
        <Card className="p-6 text-center mt-8 bg-muted/50">
          <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-2">
            {language === "es" ? "¿Necesitas ayuda?" : "Need help?"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "es" 
              ? "Contáctanos antes de abrir una disputa"
              : "Contact us before opening a dispute"}
          </p>
          <Button asChild>
            <a href="mailto:contacto@adbroll.com">contacto@adbroll.com</a>
          </Button>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
