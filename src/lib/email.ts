import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { to, subject, html, from },
  });

  if (error) {
    console.error("Error sending email:", error);
    throw error;
  }

  return data;
}

// Brand colors and styles
const brandStyles = {
  primaryColor: "#F31260",
  textColor: "#0F172A",
  mutedColor: "#64748B",
  bgColor: "#FAFAFA",
  cardBg: "#FFFFFF",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// Reusable email wrapper
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdBroll</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandStyles.bgColor}; font-family: ${brandStyles.fontFamily};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brandStyles.bgColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${brandStyles.cardBg}; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 24px;">
              <img src="https://gcntnilurlulejwwtpaa.supabase.co/storage/v1/object/public/assets/logo-dark.png" alt="AdBroll" height="48" style="height: 48px;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px; color: ${brandStyles.mutedColor}; font-size: 12px; text-align: center;">
                © 2025 AdBroll — Ecom Genius LLC
              </p>
              <p style="margin: 0; color: ${brandStyles.mutedColor}; font-size: 12px; text-align: center;">
                <a href="https://adbroll.com/support" style="color: ${brandStyles.mutedColor}; text-decoration: underline;">Soporte</a> · 
                <a href="https://adbroll.com/terms" style="color: ${brandStyles.mutedColor}; text-decoration: underline;">Términos</a> · 
                <a href="https://adbroll.com/privacy" style="color: ${brandStyles.mutedColor}; text-decoration: underline;">Privacidad</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const ctaButton = (text: string, url: string) => `
  <a href="${url}" 
     style="display: inline-block; background: ${brandStyles.primaryColor}; color: white; 
            padding: 14px 32px; text-decoration: none; border-radius: 8px; 
            font-weight: 600; font-size: 16px; margin-top: 24px;">
    ${text}
  </a>
`;

// Email templates
export const emailTemplates = {
  // 1. Welcome email (after registration)
  welcome: (name: string) => ({
    subject: "🎉 ¡Bienvenido a AdBroll!",
    html: emailWrapper(`
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¡Hola${name ? ` ${name}` : ""}! 👋
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bienvenido a <strong>AdBroll</strong>, la plataforma de analítica para creadores de TikTok Shop.
      </p>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Con tu cuenta gratuita puedes explorar:
      </p>
      <ul style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
        <li>📹 Los videos más rentables del momento</li>
        <li>📊 Métricas de productos con mejores comisiones</li>
        <li>👥 Los creadores top de TikTok Shop</li>
      </ul>
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        <strong>Tip:</strong> Suscríbete a AdBroll Pro para desbloquear guiones IA, análisis completo y herramientas de generación.
      </p>
      ${ctaButton("Explorar Dashboard", "https://adbroll.com/app")}
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; margin-top: 32px;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // 2. Subscription confirmed
  subscriptionConfirmed: (email: string, price: string = "$14.99 USD") => ({
    subject: "✅ ¡Tu suscripción a AdBroll Pro está activa!",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">✅</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Pago confirmado!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Tu suscripción a <strong>AdBroll Pro</strong> (${price}/mes) está activa.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${brandStyles.mutedColor};">Ahora tienes acceso a:</p>
        <ul style="color: ${brandStyles.textColor}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>✨ Guiones transcritos con IA</li>
          <li>🎯 Análisis de estructura de scripts</li>
          <li>🔄 Generación de variantes de hooks</li>
          <li>💎 Descubridor de oportunidades</li>
          <li>🛠️ Herramientas de creación de contenido</li>
          <li>📈 Datos actualizados diariamente</li>
        </ul>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Ir al Dashboard", "https://adbroll.com/app")}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Tu suscripción se renovará automáticamente cada mes.<br>
        Puedes cancelar en cualquier momento desde <a href="https://adbroll.com/settings" style="color: ${brandStyles.primaryColor};">Configuración</a>.
      </p>
    `),
  }),

  // 3. Subscription cancelled
  subscriptionCancelled: (email: string) => ({
    subject: "Tu suscripción a AdBroll Pro ha sido cancelada",
    html: emailWrapper(`
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Suscripción cancelada
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu suscripción a AdBroll Pro ha sido cancelada exitosamente.
      </p>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Aún tendrás acceso a las funciones Pro hasta el final de tu período de facturación actual.
      </p>
      <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          <strong>¿Cambiaste de opinión?</strong><br>
          Puedes reactivar tu suscripción en cualquier momento desde tu cuenta.
        </p>
      </div>
      ${ctaButton("Reactivar suscripción", "https://adbroll.com/pricing")}
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; margin-top: 32px;">
        Gracias por haber sido parte de AdBroll Pro. Esperamos verte de nuevo pronto.
      </p>
    `),
  }),

  // 4. Payment failed
  paymentFailed: (email: string) => ({
    subject: "⚠️ Problema con tu pago de AdBroll",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #FEE2E2; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">⚠️</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        No pudimos procesar tu pago
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hubo un problema al procesar el pago de tu suscripción a AdBroll Pro.
      </p>
      <div style="background: #FEF2F2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #EF4444;">
        <p style="margin: 0; font-size: 14px; color: #991B1B;">
          <strong>Acción requerida:</strong><br>
          Por favor actualiza tu método de pago para evitar la interrupción del servicio.
        </p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Actualizar método de pago", "https://adbroll.com/settings")}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Si tienes preguntas, contacta a <a href="mailto:contacto@adbroll.com" style="color: ${brandStyles.primaryColor};">contacto@adbroll.com</a>
      </p>
    `),
  }),

  // 5. Password reset
  passwordReset: (resetLink: string) => ({
    subject: "🔐 Restablecer tu contraseña de AdBroll",
    html: emailWrapper(`
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Restablecer contraseña
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta de AdBroll.
      </p>
      ${ctaButton("Restablecer Contraseña", resetLink)}
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; margin-top: 32px;">
        Este enlace expirará en 1 hora.
      </p>
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; margin-top: 16px;">
        Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
      </p>
    `),
  }),

  // 6. Account setup after payment (for guest checkout)
  accountSetup: (email: string, setupLink: string) => ({
    subject: "🎉 Configura tu cuenta de AdBroll Pro",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">🎉</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Tu pago fue exitoso!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Tu suscripción a AdBroll Pro está activa. Solo falta un paso: crear tu contraseña.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Configurar mi cuenta", setupLink)}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        O puedes iniciar sesión con Google usando el email <strong>${email}</strong>
      </p>
    `),
  }),

  // 7. Affiliate commission earned
  affiliateCommission: (amount: string, referredEmail: string) => ({
    subject: `💰 ¡Ganaste ${amount} en comisión!`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">💰</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Nueva comisión!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Un usuario referido por ti acaba de pagar su suscripción.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${brandStyles.mutedColor};">Comisión ganada</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10B981;">${amount}</p>
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; text-align: center;">
        Usuario referido: ${referredEmail.substring(0, 3)}***@***
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver mis ganancias", "https://adbroll.com/affiliates")}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Los pagos se procesan automáticamente cada miércoles (mínimo $50 USD).
      </p>
    `),
  }),

  // 8. Renewal reminder (3 days before)
  renewalReminder: (renewDate: string, price: string = "$14.99 USD") => ({
    subject: "📅 Tu suscripción se renovará pronto",
    html: emailWrapper(`
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Recordatorio de renovación
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu suscripción a AdBroll Pro se renovará automáticamente el <strong>${renewDate}</strong>.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 14px; color: ${brandStyles.mutedColor};">Plan</td>
            <td style="font-size: 14px; color: ${brandStyles.textColor}; text-align: right; font-weight: 600;">AdBroll Pro</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: ${brandStyles.mutedColor}; padding-top: 8px;">Monto</td>
            <td style="font-size: 14px; color: ${brandStyles.textColor}; text-align: right; font-weight: 600; padding-top: 8px;">${price}/mes</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: ${brandStyles.mutedColor}; padding-top: 8px;">Fecha</td>
            <td style="font-size: 14px; color: ${brandStyles.textColor}; text-align: right; font-weight: 600; padding-top: 8px;">${renewDate}</td>
          </tr>
        </table>
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; margin: 0;">
        Si deseas cancelar o cambiar tu método de pago, puedes hacerlo desde <a href="https://adbroll.com/settings" style="color: ${brandStyles.primaryColor};">Configuración</a>.
      </p>
    `),
  }),

  // =========================================
  // CAMPAIGN EMAIL TEMPLATES
  // =========================================

  // 9. Campaign submission received (for brands)
  campaignSubmissionReceived: (brandName: string, campaignTitle: string, creatorName: string) => ({
    subject: `📹 Nuevo video recibido para "${campaignTitle}"`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DBEAFE; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">📹</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Nuevo video recibido!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hola <strong>${brandName}</strong>, un creador ha enviado un video para tu campaña.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 14px; color: ${brandStyles.mutedColor};">Campaña</td>
            <td style="font-size: 14px; color: ${brandStyles.textColor}; text-align: right; font-weight: 600;">${campaignTitle}</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: ${brandStyles.mutedColor}; padding-top: 12px;">Creador</td>
            <td style="font-size: 14px; color: ${brandStyles.textColor}; text-align: right; font-weight: 600; padding-top: 12px;">${creatorName}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Revisar video", "https://adbroll.com/brand/dashboard")}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Revisa el video y apruébalo o solicita cambios desde tu panel de marca.
      </p>
    `),
  }),

  // 10. Submission approved (for creators)
  submissionApproved: (creatorName: string, campaignTitle: string, approvedPrice: string) => ({
    subject: `✅ ¡Tu video fue aprobado! - "${campaignTitle}"`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">✅</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Video aprobado!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Felicidades <strong>${creatorName}</strong>, tu video para la campaña "${campaignTitle}" ha sido aprobado.
      </p>
      <div style="background: #DCFCE7; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #166534;">Pago aprobado</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #166534;">${approvedPrice}</p>
      </div>
      <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          <strong>Siguiente paso:</strong><br>
          Envía tu SparkCode para completar la transacción y recibir tu pago.
        </p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Enviar SparkCode", "https://adbroll.com/my-submissions")}
      </div>
    `),
  }),

  // 11. Submission rejected (for creators)
  submissionRejected: (creatorName: string, campaignTitle: string, feedback?: string) => ({
    subject: `Tu video para "${campaignTitle}" no fue aprobado`,
    html: emailWrapper(`
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Video no aprobado
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hola <strong>${creatorName}</strong>, lamentamos informarte que tu video para la campaña "${campaignTitle}" no fue aprobado.
      </p>
      ${feedback ? `
        <div style="background: #FEF2F2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #EF4444;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #991B1B; font-weight: 600;">FEEDBACK DE LA MARCA:</p>
          <p style="margin: 0; font-size: 14px; color: #991B1B;">${feedback}</p>
        </div>
      ` : ''}
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        No te desanimes. Puedes aplicar a otras campañas disponibles en la plataforma.
      </p>
      ${ctaButton("Ver más campañas", "https://adbroll.com/campaigns")}
    `),
  }),

  // 12. SparkCode requested (for creators)
  sparkCodeRequested: (creatorName: string, campaignTitle: string) => ({
    subject: `📲 Envía tu SparkCode para "${campaignTitle}"`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DBEAFE; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">📲</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        SparkCode requerido
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hola <strong>${creatorName}</strong>, la marca ha aprobado tu video para "${campaignTitle}".
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; font-size: 14px; color: ${brandStyles.textColor}; font-weight: 600;">
          ¿Cómo obtener tu SparkCode?
        </p>
        <ol style="color: ${brandStyles.textColor}; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Abre TikTok y ve a tu video publicado</li>
          <li>Toca los 3 puntos (...) → Configuración de anuncios</li>
          <li>Activa "Autorización de anuncios"</li>
          <li>Genera el código y cópialo</li>
        </ol>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Enviar SparkCode", "https://adbroll.com/my-submissions")}
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Una vez enviado el SparkCode, recibirás tu pago.
      </p>
    `),
  }),

  // 13. Campaign payment complete (for creators)
  campaignPaymentComplete: (creatorName: string, campaignTitle: string, amount: string) => ({
    subject: `💰 ¡Pago recibido! - "${campaignTitle}"`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">💰</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Pago completado!
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Felicidades <strong>${creatorName}</strong>, has recibido el pago por tu video en "${campaignTitle}".
      </p>
      <div style="background: #DCFCE7; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #166534;">Monto recibido</p>
        <p style="margin: 0; font-size: 36px; font-weight: 700; color: #166534;">${amount}</p>
      </div>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        ¡Gracias por tu excelente trabajo! Sigue creando contenido increíble.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver más campañas", "https://adbroll.com/campaigns")}
      </div>
    `),
  }),

  // 14. Changes requested (for creators)
  changesRequested: (creatorName: string, campaignTitle: string, feedback: string) => ({
    subject: `⚠️ Cambios solicitados para "${campaignTitle}"`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #FEF3C7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
          <span style="font-size: 32px;">⚠️</span>
        </div>
      </div>
      <h1 style="color: ${brandStyles.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        Cambios solicitados
      </h1>
      <p style="color: ${brandStyles.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hola <strong>${creatorName}</strong>, la marca ha solicitado algunos cambios en tu video para "${campaignTitle}".
      </p>
      <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #92400E; font-weight: 600;">FEEDBACK DE LA MARCA:</p>
        <p style="margin: 0; font-size: 14px; color: #92400E;">${feedback}</p>
      </div>
      <p style="color: ${brandStyles.mutedColor}; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Realiza los cambios y vuelve a enviar tu video actualizado.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver detalles", "https://adbroll.com/my-submissions")}
      </div>
    `),
  }),
};

// Export email types for the edge function
export type EmailType = keyof typeof emailTemplates;