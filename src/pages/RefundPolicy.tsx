import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { RefreshCcw, ArrowLeft, Clock, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const RefundPolicy = () => {
  const { language } = useLanguage();

  const content = {
    es: {
      title: "Política de Reembolsos y Cancelaciones",
      lastUpdated: "Última actualización: Diciembre 2024",
      backButton: "Volver al inicio",
      intro: "En Adbroll queremos que estés completamente satisfecho con tu suscripción. Si tienes algún problema, estamos aquí para ayudarte.",
      sections: [
        {
          title: "1. ¿Qué es Adbroll?",
          content: `Adbroll es una plataforma de análisis de datos para creadores de TikTok Shop. Proporciona acceso a:

• Rankings de productos más vendidos
• Transcripción de guiones de videos virales con IA
• Análisis de estructura de contenido
• Generación de variantes de guiones
• Identificación de oportunidades de alta comisión
• Actualizaciones diarias de datos`
        },
        {
          title: "2. Cómo Funciona la Suscripción",
          content: `• Suscripción mensual de $29 USD
• Facturación automática cada 30 días
• Acceso inmediato a todas las funciones al pagar
• Sin contratos de permanencia
• Cancela cuando quieras sin penalizaciones`
        },
        {
          title: "3. Política de Cancelación",
          content: `Puedes cancelar tu suscripción en cualquier momento:

1. Ve a Configuración → Gestionar suscripción
2. Haz clic en "Cancelar plan" en el portal de pagos
3. Tu acceso continuará hasta el final del período pagado
4. No hay cargos adicionales después de cancelar

No necesitas contactar soporte para cancelar. El proceso es automático y puedes hacerlo tú mismo.`
        },
        {
          title: "4. Política de Reembolsos",
          content: `Ofrecemos reembolso completo dentro de las primeras 24 horas si:

• No obtuviste el valor esperado del servicio
• Experimentaste problemas técnicos que no pudimos resolver
• Fue un cargo no autorizado

Después de 24 horas o uso sustancial del servicio (acceso a scripts, análisis de videos, generación de contenido), no ofrecemos reembolsos. Sin embargo, siempre puedes cancelar para evitar futuros cargos.`
        },
        {
          title: "5. Cómo Solicitar un Reembolso",
          content: `Para solicitar un reembolso dentro del período elegible:

1. Envía un email a contacto@adbroll.com
2. Incluye el email asociado a tu cuenta
3. Describe brevemente el motivo de la solicitud
4. Recibirás confirmación en 24-48 horas
5. El reembolso se procesa en 5-7 días hábiles a tu método de pago original`
        },
        {
          title: "6. Antes de Abrir una Disputa",
          content: `Si tienes algún problema con tu pago o suscripción, contáctanos primero:

📧 Email: contacto@adbroll.com
⏱️ Tiempo de respuesta: 24-48 horas

Resolveremos cualquier problema rápidamente. Abrir una disputa directamente con tu banco puede demorar semanas y afectar tu cuenta. Podemos ayudarte más rápido si nos contactas directamente.`
        }
      ],
      importantNote: "Nota importante",
      importantText: "Contáctanos ANTES de abrir una disputa con tu banco. Resolvemos todo en menos de 48 horas."
    },
    en: {
      title: "Refund and Cancellation Policy",
      lastUpdated: "Last updated: December 2024",
      backButton: "Back to home",
      intro: "At Adbroll we want you to be completely satisfied with your subscription. If you have any issues, we're here to help.",
      sections: [
        {
          title: "1. What is Adbroll?",
          content: `Adbroll is a data analytics platform for TikTok Shop creators. It provides access to:

• Best-selling product rankings
• AI-powered viral video script transcription
• Content structure analysis
• Script variant generation
• High-commission opportunity identification
• Daily data updates`
        },
        {
          title: "2. How the Subscription Works",
          content: `• $29 USD monthly subscription
• Automatic billing every 30 days
• Immediate access to all features upon payment
• No long-term contracts
• Cancel anytime without penalties`
        },
        {
          title: "3. Cancellation Policy",
          content: `You can cancel your subscription at any time:

1. Go to Settings → Manage subscription
2. Click "Cancel plan" in the payment portal
3. Your access will continue until the end of the paid period
4. No additional charges after cancellation

You don't need to contact support to cancel. The process is automatic and you can do it yourself.`
        },
        {
          title: "4. Refund Policy",
          content: `We offer a full refund within the first 24 hours if:

• You didn't get the expected value from the service
• You experienced technical issues we couldn't resolve
• It was an unauthorized charge

After 24 hours or substantial use of the service (accessing scripts, analyzing videos, generating content), we don't offer refunds. However, you can always cancel to avoid future charges.`
        },
        {
          title: "5. How to Request a Refund",
          content: `To request a refund within the eligible period:

1. Send an email to contacto@adbroll.com
2. Include the email associated with your account
3. Briefly describe the reason for the request
4. You'll receive confirmation within 24-48 hours
5. Refund is processed in 5-7 business days to your original payment method`
        },
        {
          title: "6. Before Opening a Dispute",
          content: `If you have any issues with your payment or subscription, contact us first:

📧 Email: contacto@adbroll.com
⏱️ Response time: 24-48 hours

We'll resolve any issue quickly. Opening a dispute directly with your bank can take weeks and affect your account. We can help you faster if you contact us directly.`
        }
      ],
      importantNote: "Important note",
      importantText: "Contact us BEFORE opening a dispute with your bank. We resolve everything in less than 48 hours."
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

        <p className="text-muted-foreground text-center mb-8 text-lg">{data.intro}</p>

        {/* Important Alert */}
        <Card className="p-4 mb-8 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">{data.importantNote}</h3>
              <p className="text-sm text-muted-foreground">{data.importantText}</p>
            </div>
          </div>
        </Card>

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

        {/* Contact CTA */}
        <Card className="p-6 text-center mt-8 bg-muted/50">
          <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-2">
            {language === "es" ? "¿Necesitas ayuda?" : "Need help?"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "es" 
              ? "Estamos disponibles para resolver cualquier duda"
              : "We're available to answer any questions"}
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