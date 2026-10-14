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
    { question: "¿Cómo preparo mi primer video con TokXray?", answer: "Elige una referencia de un producto que puedas demostrar. Revisa sus ventas y período; con Pro puedes analizar un video disponible y adaptar el guion a tu voz. Graba tu versión y observa cómo responde tu audiencia." },
    { question: "¿Los datos son en tiempo real?", answer: "No. El catálogo se actualiza semanalmente con reportes de TikTok Shop México. Comprueba el período y la fecha del reporte antes de comparar cifras." },
    { question: "¿Necesito tarjeta para explorar?", answer: "No necesitas tarjeta para la vista previa ni para crear tu cuenta. Los datos completos y las herramientas de análisis requieren Pro. Solo pagas cuando contratas la suscripción." },
    {
      question: "¿Qué es TokXray?",
      answer: "TokXray te ayuda a elegir qué grabar para TikTok Shop México: compara productos y videos con ventas reportadas, entiende el guion y prepara tu propia versión. Las referencias orientan tus pruebas; no garantizan ventas."
    },
    {
      question: "¿Cómo funciona la suscripción?",
      answer: "Pro cuesta US$15 al mes y se renueva automáticamente. Crear tu cuenta es gratis y no genera un cobro. Puedes cancelarla en cualquier momento desde tu panel de usuario. Una vez cancelada, el acceso permanece activo hasta que concluya el periodo ya pagado."
    },
    {
      question: "¿Cómo aparecerá el cargo en mi estado de cuenta?",
      answer: 'Los cargos aparecerán como: "TOKXRAY.COM".'
    },
    {
      question: "¿Ofrecen reembolsos?",
      answer: "Consulta nuestra política de reembolsos en la página de Política de Reembolsos."
    },
    {
      question: "¿Quién opera TokXray?",
      answer: "TokXray es un producto de Ecom Genius LLC, Delaware, EE. UU."
    },
    {
      question: "¿Dónde puedo contactar soporte?",
      answer: "Correo de soporte: contacto@tokxray.com\nHorario: Lunes a viernes, 9:00 am – 6:00 pm CST."
    }
  ],
  en: [
    { question: "How do I prepare my first video with TokXray?", answer: "Choose a reference for a product you can demonstrate. Check its reported sales and period. With Pro, analyze an available video and adapt the script to your voice. Film your version and observe your audience’s response." },
    { question: "Is the data live?", answer: "No. The catalog is updated weekly with TikTok Shop Mexico reports. Check the date and reporting period before comparing figures." },
    { question: "Do I need a card to explore?", answer: "No card is required for the preview or to create an account. Full data and analysis tools require Pro. You only pay when you subscribe." },
    {
      question: "What is TokXray?",
      answer: "TokXray helps you decide what to film for TikTok Shop Mexico: compare products and videos with reported sales, understand the script and prepare your own version. References inform your tests; they do not guarantee sales."
    },
    {
      question: "How does the subscription work?",
      answer: "Pro costs US$15 per month and renews automatically. Creating an account is free and does not charge you. You can cancel it at any time from your user dashboard. Once canceled, access remains active until the end of the already paid period."
    },
    {
      question: "How will the charge appear on my statement?",
      answer: 'Charges will appear as: "TOKXRAY.COM".'
    },
    {
      question: "Do you offer refunds?",
      answer: "Please see our refund policy on the Refund Policy page."
    },
    {
      question: "Who operates TokXray?",
      answer: "TokXray is a product of Ecom Genius LLC, Delaware, USA."
    },
    {
      question: "Where can I contact support?",
      answer: "Support email: contacto@tokxray.com\nHours: Monday to Friday, 9:00 am – 6:00 pm CST."
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
              ? "Ten claro qué puedes explorar, qué incluye Pro y cómo gestionar tu cuenta"
              : "Understand what you can explore, what Pro includes and how to manage your account"
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
            href="mailto:contacto@tokxray.com" 
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
