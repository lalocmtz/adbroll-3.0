import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle, AlertTriangle, ChevronDown, ChevronUp, CreditCard, RefreshCcw, Settings, Calendar, Database, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const Support = () => {
  const { language } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const content = {
    es: {
      title: "Soporte",
      subtitle: "¿Necesitas ayuda? Estamos aquí para ti",
      alertTitle: "¿Problema con tu pago?",
      alertText: "Contáctanos ANTES de abrir una disputa con tu banco. Resolvemos todo en menos de 24 horas.",
      contactTitle: "Contacto Directo",
      contactText: "Nuestro equipo responde en 24-48 horas. Preferimos resolver cualquier problema antes de que escale.",
      faqTitle: "Preguntas Frecuentes",
      linksTitle: "Recursos Útiles",
      viewAllFaq: "Ver todas las preguntas frecuentes",
      termsLink: "Términos y Condiciones",
      refundLink: "Política de Reembolsos",
      privacyLink: "Política de Privacidad",
      faqs: [
        {
          question: "¿Cómo cancelo mi suscripción?",
          answer: "Ve a Configuración → Gestionar suscripción. Haz clic en 'Cancelar plan' en el portal de pagos. Tu acceso continuará hasta el final del período pagado. No necesitas contactar soporte.",
          icon: <Settings className="h-5 w-5" />
        },
        {
          question: "¿Puedo obtener un reembolso?",
          answer: "Ofrecemos reembolso completo dentro de las primeras 24 horas si no obtuviste valor del servicio. Después de 24 horas o uso sustancial, no hay reembolsos, pero puedes cancelar para evitar futuros cargos. Envía tu solicitud a contacto@adbroll.com.",
          icon: <RefreshCcw className="h-5 w-5" />
        },
        {
          question: "¿Cómo accedo a mi portal de pagos?",
          answer: "Ve a Configuración → Gestionar suscripción. El botón te llevará a tu portal de Stripe donde puedes ver facturas, cambiar método de pago y cancelar.",
          icon: <CreditCard className="h-5 w-5" />
        },
        {
          question: "¿Qué incluye mi suscripción?",
          answer: "Acceso completo a: rankings de productos, transcripción de videos con IA, análisis de guiones, generación de variantes, oportunidades de alta comisión, y actualizaciones diarias de datos.",
          icon: <FileText className="h-5 w-5" />
        },
        {
          question: "¿Cada cuánto se actualizan los datos?",
          answer: "Los datos se actualizan diariamente. Los rankings de productos, videos y creadores reflejan información de los últimos 7-30 días según la métrica.",
          icon: <Calendar className="h-5 w-5" />
        },
        {
          question: "¿Por qué me cobraron si ya cancelé?",
          answer: "Si cancelaste después de la fecha de renovación, el cargo ya estaba programado. Contáctanos inmediatamente a contacto@adbroll.com y lo revisamos juntos. NO abras disputa con tu banco, podemos ayudarte más rápido.",
          icon: <Database className="h-5 w-5" />
        }
      ] as FAQItem[]
    },
    en: {
      title: "Support",
      subtitle: "Need help? We're here for you",
      alertTitle: "Payment issue?",
      alertText: "Contact us BEFORE opening a dispute with your bank. We resolve everything in less than 24 hours.",
      contactTitle: "Direct Contact",
      contactText: "Our team responds within 24-48 hours. We prefer to resolve any issue before it escalates.",
      faqTitle: "Frequently Asked Questions",
      linksTitle: "Useful Resources",
      viewAllFaq: "View all FAQ",
      termsLink: "Terms and Conditions",
      refundLink: "Refund Policy",
      privacyLink: "Privacy Policy",
      faqs: [
        {
          question: "How do I cancel my subscription?",
          answer: "Go to Settings → Manage subscription. Click 'Cancel plan' in the payment portal. Your access will continue until the end of the paid period. No need to contact support.",
          icon: <Settings className="h-5 w-5" />
        },
        {
          question: "Can I get a refund?",
          answer: "We offer a full refund within the first 24 hours if you didn't get value from the service. After 24 hours or substantial use, no refunds, but you can cancel to avoid future charges. Send your request to contacto@adbroll.com.",
          icon: <RefreshCcw className="h-5 w-5" />
        },
        {
          question: "How do I access my payment portal?",
          answer: "Go to Settings → Manage subscription. The button will take you to your Stripe portal where you can view invoices, change payment method, and cancel.",
          icon: <CreditCard className="h-5 w-5" />
        },
        {
          question: "What does my subscription include?",
          answer: "Full access to: product rankings, AI video transcription, script analysis, variant generation, high-commission opportunities, and daily data updates.",
          icon: <FileText className="h-5 w-5" />
        },
        {
          question: "How often is data updated?",
          answer: "Data is updated daily. Product, video, and creator rankings reflect information from the last 7-30 days depending on the metric.",
          icon: <Calendar className="h-5 w-5" />
        },
        {
          question: "Why was I charged if I already canceled?",
          answer: "If you canceled after the renewal date, the charge was already scheduled. Contact us immediately at contacto@adbroll.com and we'll review it together. DON'T open a dispute with your bank, we can help you faster.",
          icon: <Database className="h-5 w-5" />
        }
      ] as FAQItem[]
    }
  };

  const data = content[language];

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{data.title}</h1>
        </div>
        <p className="text-muted-foreground">{data.subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Important Alert - Anti-dispute message */}
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">{data.alertTitle}</h3>
              <p className="text-sm text-muted-foreground">{data.alertText}</p>
            </div>
          </div>
        </Card>

        {/* Contact Section */}
        <Card className="p-6 text-center">
          <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{data.contactTitle}</h2>
          <p className="text-muted-foreground mb-6">{data.contactText}</p>
          <Button asChild size="lg">
            <a href="mailto:contacto@adbroll.com">
              <Mail className="h-4 w-4 mr-2" />
              contacto@adbroll.com
            </a>
          </Button>
        </Card>

        {/* FAQ Section */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 text-lg">{data.faqTitle}</h3>
          <div className="space-y-3">
            {data.faqs.map((faq, index) => (
              <div key={index} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-primary">{faq.icon}</span>
                    <span className="font-medium text-sm">{faq.question}</span>
                  </div>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground bg-muted/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link to="/faq" className="block mt-4 text-primary hover:underline text-sm text-center">
            {data.viewAllFaq} →
          </Link>
        </Card>

        {/* Useful Links */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">{data.linksTitle}</h3>
          <ul className="space-y-3">
            <li>
              <Link to="/terms" className="text-primary hover:underline text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {data.termsLink}
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="text-primary hover:underline text-sm flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                {data.refundLink}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-primary hover:underline text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {data.privacyLink}
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Support;