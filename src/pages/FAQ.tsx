import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const faqData = {
  es: [
    {
      question: "¿Qué es Adbroll?",
      answer: "Adbroll es una herramienta de análisis creativo que ayuda a identificar videos, productos y guiones que están funcionando en TikTok Shop."
    },
    {
      question: "¿Cómo funciona la suscripción?",
      answer: "La suscripción se renueva automáticamente cada mes. Puedes cancelarla en cualquier momento desde tu panel de usuario. Una vez cancelada, el acceso permanece activo hasta que concluya el periodo ya pagado."
    },
    {
      question: "¿Cómo aparecerá el cargo en mi estado de cuenta?",
      answer: 'Los cargos aparecerán como: "ADBROLL.COM".'
    },
    {
      question: "¿Ofrecen reembolsos?",
      answer: "Consulta nuestra política de reembolsos en la página de Política de Reembolsos."
    },
    {
      question: "¿Quién opera Adbroll?",
      answer: "Adbroll es un producto de Ecom Genius LLC, Delaware, EE. UU."
    },
    {
      question: "¿Dónde puedo contactar soporte?",
      answer: "Correo de soporte: contacto@adbroll.com\nHorario: Lunes a viernes, 9:00 am – 6:00 pm CST."
    }
  ],
  en: [
    {
      question: "What is Adbroll?",
      answer: "Adbroll is a creative analytics tool that helps identify videos, products, and scripts that are working on TikTok Shop."
    },
    {
      question: "How does the subscription work?",
      answer: "The subscription renews automatically every month. You can cancel it at any time from your user dashboard. Once canceled, access remains active until the end of the already paid period."
    },
    {
      question: "How will the charge appear on my statement?",
      answer: 'Charges will appear as: "ADBROLL.COM".'
    },
    {
      question: "Do you offer refunds?",
      answer: "Please see our refund policy on the Refund Policy page."
    },
    {
      question: "Who operates Adbroll?",
      answer: "Adbroll is a product of Ecom Genius LLC, Delaware, USA."
    },
    {
      question: "Where can I contact support?",
      answer: "Support email: contacto@adbroll.com\nHours: Monday to Friday, 9:00 am – 6:00 pm CST."
    }
  ]
};

const FAQ = () => {
  const { language, t } = useLanguage();
  const faqs = faqData[language];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader showMenu={false} />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t("faq")}</h1>
          <p className="text-lg text-muted-foreground">
            {language === "es" 
              ? "Encuentra respuestas a las preguntas más comunes sobre Adbroll"
              : "Find answers to the most common questions about Adbroll"
            }
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/50"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4 whitespace-pre-line">
                {faq.question.includes("reembolsos") || faq.question.includes("refunds") ? (
                  <>
                    {language === "es" ? "Consulta nuestra política de reembolsos en: " : "Please see our refund policy at: "}
                    <Link to="/refund-policy" className="text-primary hover:underline">
                      {language === "es" ? "Política de Reembolsos" : "Refund Policy"}
                    </Link>
                  </>
                ) : (
                  faq.answer
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center p-6 bg-muted rounded-xl">
          <p className="text-muted-foreground mb-2">
            {language === "es" 
              ? "¿No encontraste lo que buscabas?"
              : "Didn't find what you were looking for?"
            }
          </p>
          <a 
            href="mailto:contacto@adbroll.com" 
            className="text-primary hover:underline font-medium"
          >
            {language === "es" ? "Contáctanos" : "Contact us"} →
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
