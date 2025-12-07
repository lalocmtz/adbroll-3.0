import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  const { language, t } = useLanguage();

  const content = {
    es: {
      title: "Política de Privacidad",
      lastUpdated: "Última actualización: Diciembre 2024",
      sections: [
        {
          title: "1. Información que Recopilamos",
          content: `Recopilamos información que nos proporcionas directamente cuando:
          
• Creas una cuenta (correo electrónico, nombre)
• Te suscribes a nuestro servicio (información de pago procesada por Stripe)
• Utilizas nuestra plataforma (actividad de uso, preferencias)
• Te comunicas con nosotros (contenido de mensajes)

También recopilamos automáticamente cierta información técnica como tu dirección IP, tipo de navegador, y datos de uso para mejorar nuestros servicios.`
        },
        {
          title: "2. Uso de la Información",
          content: `Utilizamos la información recopilada para:

• Proporcionar, mantener y mejorar nuestros servicios
• Procesar transacciones y enviar notificaciones relacionadas
• Responder a tus comentarios, preguntas y solicitudes de soporte
• Enviar comunicaciones de marketing (con tu consentimiento)
• Detectar, investigar y prevenir actividades fraudulentas
• Personalizar tu experiencia en la plataforma`
        },
        {
          title: "3. Compartir Información",
          content: `No vendemos tu información personal. Podemos compartir información con:

• Proveedores de servicios que nos ayudan a operar (Stripe para pagos, Supabase para almacenamiento)
• Autoridades legales cuando sea requerido por ley
• En caso de fusión o adquisición, con el nuevo propietario

Todos nuestros proveedores están obligados a proteger tu información bajo estándares estrictos de privacidad.`
        },
        {
          title: "4. Seguridad de Datos",
          content: `Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, incluyendo:

• Encriptación de datos en tránsito (HTTPS/TLS)
• Almacenamiento seguro de contraseñas (hash + salt)
• Acceso restringido a datos personales
• Monitoreo regular de seguridad

Sin embargo, ningún método de transmisión por Internet es 100% seguro.`
        },
        {
          title: "5. Tus Derechos",
          content: `Tienes derecho a:

• Acceder a tu información personal
• Corregir datos inexactos
• Eliminar tu cuenta y datos asociados
• Oponerte al procesamiento de tus datos
• Exportar tus datos en formato legible

Para ejercer estos derechos, contacta a contacto@adbroll.com`
        },
        {
          title: "6. Cookies",
          content: `Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas para entender cómo se usa el servicio. Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad.`
        },
        {
          title: "7. Cambios a esta Política",
          content: `Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en la plataforma. El uso continuado del servicio después de los cambios constituye aceptación de la política actualizada.`
        },
        {
          title: "8. Contacto",
          content: `Si tienes preguntas sobre esta Política de Privacidad, contáctanos en:
          
Email: contacto@adbroll.com`
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: December 2024",
      sections: [
        {
          title: "1. Information We Collect",
          content: `We collect information you provide directly when:
          
• You create an account (email, name)
• You subscribe to our service (payment information processed by Stripe)
• You use our platform (usage activity, preferences)
• You communicate with us (message content)

We also automatically collect certain technical information such as your IP address, browser type, and usage data to improve our services.`
        },
        {
          title: "2. Use of Information",
          content: `We use the collected information to:

• Provide, maintain, and improve our services
• Process transactions and send related notifications
• Respond to your comments, questions, and support requests
• Send marketing communications (with your consent)
• Detect, investigate, and prevent fraudulent activities
• Personalize your experience on the platform`
        },
        {
          title: "3. Sharing Information",
          content: `We do not sell your personal information. We may share information with:

• Service providers that help us operate (Stripe for payments, Supabase for storage)
• Legal authorities when required by law
• In case of merger or acquisition, with the new owner

All our providers are required to protect your information under strict privacy standards.`
        },
        {
          title: "4. Data Security",
          content: `We implement technical and organizational security measures to protect your information, including:

• Data encryption in transit (HTTPS/TLS)
• Secure password storage (hash + salt)
• Restricted access to personal data
• Regular security monitoring

However, no method of transmission over the Internet is 100% secure.`
        },
        {
          title: "5. Your Rights",
          content: `You have the right to:

• Access your personal information
• Correct inaccurate data
• Delete your account and associated data
• Object to the processing of your data
• Export your data in readable format

To exercise these rights, contact contacto@adbroll.com`
        },
        {
          title: "6. Cookies",
          content: `We use essential cookies for platform functionality and analytical cookies to understand how the service is used. You can configure your browser to reject cookies, although this may affect functionality.`
        },
        {
          title: "7. Changes to this Policy",
          content: `We may update this policy occasionally. We will notify you of significant changes by email or through a notice on the platform. Continued use of the service after changes constitutes acceptance of the updated policy.`
        },
        {
          title: "8. Contact",
          content: `If you have questions about this Privacy Policy, contact us at:
          
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
        <Link to="/">
          <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Volver al inicio' : 'Back to home'}
          </Button>
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
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

export default Privacy;
