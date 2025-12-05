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

const faqData = {
  es: [
    {
      question: "¿Qué es Adbroll?",
      answer: "Adbroll es una plataforma de análisis para creadores de TikTok Shop México. Te mostramos los videos más vendedores, los productos más rentables y los creadores más exitosos para que puedas inspirarte y replicar estrategias que funcionan."
    },
    {
      question: "¿De dónde salen los datos?",
      answer: "Los datos provienen de Kalodata, una de las herramientas de análisis más confiables para TikTok Shop. Importamos y procesamos la información diariamente para brindarte insights actualizados sobre rendimiento de videos, productos y creadores."
    },
    {
      question: "¿Cada cuánto se actualizan los rankings?",
      answer: "Los rankings se actualizan diariamente. Nuestro equipo importa nuevos datos de Kalodata regularmente para asegurar que siempre veas información fresca y relevante del mercado mexicano de TikTok Shop."
    },
    {
      question: "¿Puedo descargar los scripts?",
      answer: "Sí, puedes copiar cualquier script transcrito directamente desde la plataforma. En el modal de análisis de cada video encontrarás un botón para copiar el guión completo. También puedes generar variantes con IA y copiarlas."
    },
    {
      question: "¿Cómo se calculan los ingresos y la comisión?",
      answer: "Los ingresos mostrados representan el GMV (Gross Merchandise Value) reportado por Kalodata. La comisión estimada se calcula usando la tasa de comisión del producto (si está disponible) o una tasa estándar del 6-8% sobre los ingresos."
    },
    {
      question: "¿Qué incluye la suscripción?",
      answer: "La suscripción de $49 USD/mes incluye acceso completo a: Top 100 videos más vendedores, catálogo de productos rentables, directorio de creadores exitosos, transcripción de scripts con IA, análisis de estructura de videos, y generación de variantes de guiones."
    },
    {
      question: "¿Cómo funciona la transcripción con IA?",
      answer: "Cuando haces clic en 'Analizar guion y replicar', nuestro sistema descarga el audio del video de TikTok, lo transcribe usando inteligencia artificial (AssemblyAI/Whisper), y luego analiza la estructura del script identificando Hook, Cuerpo y CTA."
    },
    {
      question: "¿Puedo cancelar mi suscripción en cualquier momento?",
      answer: "Sí, puedes cancelar tu suscripción cuando quieras desde tu perfil. Mantendrás acceso hasta el final del período de facturación actual. No hay cargos adicionales por cancelación."
    }
  ],
  en: [
    {
      question: "What is Adbroll?",
      answer: "Adbroll is an analytics platform for TikTok Shop Mexico creators. We show you the best-selling videos, most profitable products, and most successful creators so you can get inspired and replicate strategies that work."
    },
    {
      question: "Where does the data come from?",
      answer: "The data comes from Kalodata, one of the most reliable analytics tools for TikTok Shop. We import and process information daily to provide you with updated insights on video, product, and creator performance."
    },
    {
      question: "How often are rankings updated?",
      answer: "Rankings are updated daily. Our team imports new data from Kalodata regularly to ensure you always see fresh and relevant information from the Mexican TikTok Shop market."
    },
    {
      question: "Can I download the scripts?",
      answer: "Yes, you can copy any transcribed script directly from the platform. In each video's analysis modal, you'll find a button to copy the complete script. You can also generate AI variants and copy them."
    },
    {
      question: "How are revenue and commission calculated?",
      answer: "The revenue shown represents the GMV (Gross Merchandise Value) reported by Kalodata. The estimated commission is calculated using the product's commission rate (if available) or a standard rate of 6-8% on revenue."
    },
    {
      question: "What's included in the subscription?",
      answer: "The $49 USD/month subscription includes full access to: Top 100 best-selling videos, profitable product catalog, successful creator directory, AI script transcription, video structure analysis, and script variant generation."
    },
    {
      question: "How does AI transcription work?",
      answer: "When you click 'Analyze script and replicate', our system downloads the TikTok video audio, transcribes it using artificial intelligence (AssemblyAI/Whisper), and then analyzes the script structure identifying Hook, Body, and CTA."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you can cancel your subscription whenever you want from your profile. You'll maintain access until the end of the current billing period. There are no additional cancellation charges."
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
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.answer}
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
