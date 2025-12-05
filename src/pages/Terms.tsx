import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

const Terms = () => {
  const { language, t } = useLanguage();

  const content = {
    es: {
      title: "Términos y Condiciones",
      lastUpdated: "Última actualización: Diciembre 2024",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: `Al acceder y utilizar Adbroll ("el Servicio"), aceptas estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar el Servicio.

Estos términos se aplican a todos los usuarios, visitantes y otras personas que accedan o utilicen el Servicio.`
        },
        {
          title: "2. Descripción del Servicio",
          content: `Adbroll es una plataforma de análisis para creadores de TikTok Shop México que proporciona:

• Acceso a datos de rendimiento de videos, productos y creadores
• Transcripción de scripts mediante inteligencia artificial
• Análisis de estructura de contenido
• Generación de variantes de guiones con IA
• Herramientas de guardado y organización de favoritos

El Servicio se ofrece "tal cual" y puede modificarse en cualquier momento.`
        },
        {
          title: "3. Cuentas de Usuario",
          content: `Para utilizar ciertas funciones del Servicio, debes crear una cuenta proporcionando información precisa y completa. Eres responsable de:

• Mantener la confidencialidad de tu contraseña
• Todas las actividades que ocurran bajo tu cuenta
• Notificarnos inmediatamente sobre cualquier uso no autorizado

Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.`
        },
        {
          title: "4. Suscripción y Pagos",
          content: `El acceso completo al Servicio requiere una suscripción pagada de $49 USD mensuales. Al suscribirte:

• Autorizas cargos recurrentes a tu método de pago
• Aceptas que los precios pueden cambiar con aviso previo de 30 días
• Reconoces que no hay reembolsos por períodos parciales

Los pagos son procesados de forma segura por Stripe. No almacenamos información de tarjetas de crédito.`
        },
        {
          title: "5. Uso Aceptable",
          content: `Te comprometes a usar el Servicio solo para fines legales. Está prohibido:

• Copiar, modificar o distribuir el contenido sin autorización
• Usar el Servicio para actividades ilegales o fraudulentas
• Intentar acceder a cuentas o datos de otros usuarios
• Interferir con el funcionamiento del Servicio
• Usar herramientas automatizadas para extraer datos masivamente
• Revender o redistribuir el acceso al Servicio`
        },
        {
          title: "6. Propiedad Intelectual",
          content: `El Servicio y su contenido original (excluyendo datos de terceros) son propiedad de Adbroll. La información de videos, productos y creadores proviene de fuentes públicas y de terceros.

Los scripts transcritos y sus variantes generadas pueden usarse para tu contenido personal, pero no pueden redistribuirse comercialmente como base de datos.`
        },
        {
          title: "7. Limitación de Responsabilidad",
          content: `El Servicio se proporciona "tal cual" sin garantías de ningún tipo. No garantizamos:

• La exactitud o actualidad de los datos mostrados
• Disponibilidad ininterrumpida del Servicio
• Resultados específicos del uso de la información

En ningún caso seremos responsables por daños indirectos, incidentales o consecuentes derivados del uso del Servicio.`
        },
        {
          title: "8. Modificaciones",
          content: `Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios significativos se notificarán por correo electrónico o mediante aviso en el Servicio con al menos 15 días de anticipación.

El uso continuado del Servicio después de los cambios constituye aceptación de los nuevos términos.`
        },
        {
          title: "9. Terminación",
          content: `Puedes cancelar tu cuenta en cualquier momento desde tu perfil. Nos reservamos el derecho de terminar o suspender tu acceso inmediatamente, sin previo aviso, por violación de estos términos.

Al terminar, tu derecho a usar el Servicio cesará inmediatamente.`
        },
        {
          title: "10. Ley Aplicable",
          content: `Estos Términos se rigen por las leyes de México. Cualquier disputa se resolverá en los tribunales competentes de la Ciudad de México.`
        },
        {
          title: "11. Contacto",
          content: `Para preguntas sobre estos Términos, contáctanos en:

Email: contacto@adbroll.com`
        }
      ]
    },
    en: {
      title: "Terms and Conditions",
      lastUpdated: "Last updated: December 2024",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: `By accessing and using Adbroll ("the Service"), you accept these Terms and Conditions. If you do not agree with any part of these terms, you should not use the Service.

These terms apply to all users, visitors, and others who access or use the Service.`
        },
        {
          title: "2. Description of Service",
          content: `Adbroll is an analytics platform for TikTok Shop Mexico creators that provides:

• Access to performance data for videos, products, and creators
• Script transcription using artificial intelligence
• Content structure analysis
• AI-powered script variant generation
• Favorites saving and organization tools

The Service is offered "as is" and may be modified at any time.`
        },
        {
          title: "3. User Accounts",
          content: `To use certain features of the Service, you must create an account providing accurate and complete information. You are responsible for:

• Maintaining the confidentiality of your password
• All activities that occur under your account
• Notifying us immediately of any unauthorized use

We reserve the right to suspend or terminate accounts that violate these terms.`
        },
        {
          title: "4. Subscription and Payments",
          content: `Full access to the Service requires a paid subscription of $49 USD monthly. By subscribing:

• You authorize recurring charges to your payment method
• You accept that prices may change with 30 days prior notice
• You acknowledge that there are no refunds for partial periods

Payments are processed securely by Stripe. We do not store credit card information.`
        },
        {
          title: "5. Acceptable Use",
          content: `You agree to use the Service only for lawful purposes. It is prohibited to:

• Copy, modify, or distribute content without authorization
• Use the Service for illegal or fraudulent activities
• Attempt to access other users' accounts or data
• Interfere with the operation of the Service
• Use automated tools to mass extract data
• Resell or redistribute access to the Service`
        },
        {
          title: "6. Intellectual Property",
          content: `The Service and its original content (excluding third-party data) are owned by Adbroll. Information about videos, products, and creators comes from public sources and third parties.

Transcribed scripts and their generated variants may be used for your personal content but cannot be commercially redistributed as a database.`
        },
        {
          title: "7. Limitation of Liability",
          content: `The Service is provided "as is" without warranties of any kind. We do not guarantee:

• The accuracy or timeliness of data shown
• Uninterrupted availability of the Service
• Specific results from using the information

In no event shall we be liable for indirect, incidental, or consequential damages arising from the use of the Service.`
        },
        {
          title: "8. Modifications",
          content: `We reserve the right to modify these Terms at any time. Significant changes will be notified by email or through a notice in the Service with at least 15 days advance notice.

Continued use of the Service after changes constitutes acceptance of the new terms.`
        },
        {
          title: "9. Termination",
          content: `You may cancel your account at any time from your profile. We reserve the right to terminate or suspend your access immediately, without prior notice, for violation of these terms.

Upon termination, your right to use the Service will cease immediately.`
        },
        {
          title: "10. Governing Law",
          content: `These Terms are governed by the laws of Mexico. Any dispute will be resolved in the competent courts of Mexico City.`
        },
        {
          title: "11. Contact",
          content: `For questions about these Terms, contact us at:

Email: contacto@adbroll.com`
        }
      ]
    }
  };

  const data = content[language];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader showMenu={false} />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-muted-foreground">{data.lastUpdated}</p>
        </div>

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
