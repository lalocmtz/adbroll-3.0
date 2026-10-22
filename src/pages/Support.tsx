import { useLanguage } from "@/contexts/LanguageContext";
import { BrandContactLinks, BRAND_CONTACT } from "@/components/BrandContactLinks";
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
      subtitle: "Te ayudamos a seguir con tu próximo video",
      alertTitle: "¿Problema con tu pago?",
      alertText: "Escríbenos con el correo de tu cuenta, la fecha y el importe del cargo para que podamos revisarlo. No compartas datos completos de tu tarjeta.",
      contactTitle: "Contacto Directo",
      contactText: "Cuéntanos qué estabas intentando hacer y qué ocurrió. Si puedes, adjunta una captura sin datos sensibles.",
      faqTitle: "Preguntas Frecuentes",
      linksTitle: "Recursos Útiles",
      viewAllFaq: "Ver todas las preguntas frecuentes",
      termsLink: "Términos y Condiciones",
      refundLink: "Política de Reembolsos",
      privacyLink: "Política de Privacidad",
      faqs: [
        {
          question: "¿Cómo cancelo mi suscripción?",
          answer: "Ve a Configuración → Mis pagos. Haz clic en 'Cancelar plan' en el portal de pagos. Tu acceso continuará hasta el final del período pagado. No necesitas contactar soporte.",
          icon: <Settings className="h-5 w-5" />
        },
        {
          question: "¿Puedo obtener un reembolso?",
          answer: "La Política de Reembolsos indica los casos elegibles y el plazo para solicitarlos. Envíanos el correo de tu cuenta y los detalles del cargo a contacto@tokxray.com para revisar tu caso.",
          icon: <RefreshCcw className="h-5 w-5" />
        },
        {
          question: "¿Cómo accedo a mi portal de pagos?",
          answer: "Ve a Configuración → Mis pagos. El botón te llevará a tu portal de Stripe donde puedes ver facturas, cambiar método de pago y cancelar.",
          icon: <CreditCard className="h-5 w-5" />
        },
        {
          question: "¿Qué incluye mi suscripción?",
          answer: "Pro te permite comparar productos y videos por sus ventas reportadas, analizar videos disponibles y preparar variantes de guion con IA. El catálogo se actualiza semanalmente.",
          icon: <FileText className="h-5 w-5" />
        },
        {
          question: "¿Cada cuánto se actualizan los datos?",
          answer: "Actualizamos el catálogo semanalmente. Revisa la fecha y el período del reporte en cada ranking: no son ventas en tiempo real ni períodos disponibles para todos los registros.",
          icon: <Calendar className="h-5 w-5" />
        },
        {
          question: "¿Por qué me cobraron si ya cancelé?",
          answer: "Revisa la fecha efectiva de cancelación y el período de la factura en Configuración → Mis pagos. Envíanos esos datos a contacto@tokxray.com para revisar el cargo contigo.",
          icon: <Database className="h-5 w-5" />
        }
      ] as FAQItem[]
    },
    en: {
      title: "Support",
      subtitle: "Get help with your next step",
      alertTitle: "Payment issue?",
      alertText: "Send your account email, the charge date and the amount so we can review it. Do not share full card details.",
      contactTitle: "Direct Contact",
      contactText: "Tell us what you were trying to do and what happened. A screenshot without sensitive information can help.",
      faqTitle: "Frequently Asked Questions",
      linksTitle: "Useful Resources",
      viewAllFaq: "View all FAQ",
      termsLink: "Terms and Conditions",
      refundLink: "Refund Policy",
      privacyLink: "Privacy Policy",
      faqs: [
        {
          question: "How do I cancel my subscription?",
          answer: "Go to Settings → Billing. Click 'Cancel plan' in the payment portal. Your access will continue until the end of the paid period. No need to contact support.",
          icon: <Settings className="h-5 w-5" />
        },
        {
          question: "Can I get a refund?",
          answer: "The Refund Policy explains eligible cases and request deadlines. Send your account email and charge details to contacto@tokxray.com so we can review your case.",
          icon: <RefreshCcw className="h-5 w-5" />
        },
        {
          question: "How do I access my payment portal?",
          answer: "Go to Settings → Billing. The button will take you to your Stripe portal where you can view invoices, change payment method, and cancel.",
          icon: <CreditCard className="h-5 w-5" />
        },
        {
          question: "What does my subscription include?",
          answer: "Pro lets you compare products and videos by reported sales, analyze available videos and prepare script variations with AI. The catalog is updated weekly.",
          icon: <FileText className="h-5 w-5" />
        },
        {
          question: "How often is data updated?",
          answer: "The catalog is updated weekly. Check the date and reporting period in each ranking. These are not live sales, and not every period is available for every record.",
          icon: <Calendar className="h-5 w-5" />
        },
        {
          question: "Why was I charged if I already canceled?",
          answer: "Check the effective cancellation date and invoice period in Settings → Billing. Send these details to contacto@tokxray.com so we can review the charge with you.",
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
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <a href={`mailto:${BRAND_CONTACT.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                contacto@tokxray.com
              </a>
            </Button>
            <Button 
              asChild 
              size="lg" 
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
            >
              <a 
                href={BRAND_CONTACT.whatsapp}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-2" fill="white" />
                WhatsApp · {BRAND_CONTACT.phoneLabel}
              </a>
            </Button>
          </div>
        </Card>

        <BrandContactLinks socialOnly className="justify-center text-muted-foreground" />

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