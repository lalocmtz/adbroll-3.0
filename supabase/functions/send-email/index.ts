import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand configuration
const BRAND = {
  name: "AdBroll",
  fromEmail: "AdBroll <hola@adbroll.com>",
  supportEmail: "contacto@adbroll.com",
  baseUrl: "https://adbroll.com",
  primaryColor: "#F31260",
  textColor: "#0F172A",
  mutedColor: "#64748B",
};

interface EmailRequest {
  to: string;
  subject?: string;
  html?: string;
  from?: string;
  template?: string;
  templateData?: Record<string, string>;
  // Resend Template API mode
  template_id?: string;
  template_data?: Record<string, string>;
}

// Email wrapper with branding
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFA; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFA;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td align="center" style="padding: 40px 40px 24px;">
              <img src="https://gcntnilurlulejwwtpaa.supabase.co/storage/v1/object/public/assets/logo-dark.png" alt="${BRAND.name}" height="48" style="height: 48px;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px; color: ${BRAND.mutedColor}; font-size: 12px; text-align: center;">
                © 2025 ${BRAND.name} — Ecom Genius LLC
              </p>
              <p style="margin: 0; color: ${BRAND.mutedColor}; font-size: 12px; text-align: center;">
                <a href="${BRAND.baseUrl}/support" style="color: ${BRAND.mutedColor}; text-decoration: underline;">Soporte</a> · 
                <a href="${BRAND.baseUrl}/terms" style="color: ${BRAND.mutedColor}; text-decoration: underline;">Términos</a> · 
                <a href="${BRAND.baseUrl}/privacy" style="color: ${BRAND.mutedColor}; text-decoration: underline;">Privacidad</a>
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
     style="display: inline-block; background: ${BRAND.primaryColor}; color: white; 
            padding: 14px 32px; text-decoration: none; border-radius: 8px; 
            font-weight: 600; font-size: 16px; margin-top: 24px;">
    ${text}
  </a>
`;

// Pre-built templates
const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  // WELCOME - For paid users (existing)
  welcome: (data) => ({
    subject: "🎉 ¡Bienvenido a AdBroll!",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¡Hola${data.name ? ` ${data.name}` : ""}! 👋
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bienvenido a <strong>AdBroll</strong>, la plataforma de analítica para creadores de TikTok Shop.
      </p>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Con tu cuenta puedes explorar:
      </p>
      <ul style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
        <li>📹 Los videos más rentables del momento</li>
        <li>📊 Métricas de productos con mejores comisiones</li>
        <li>👥 Los creadores top de TikTok Shop</li>
      </ul>
      ${ctaButton("Explorar Dashboard", `${BRAND.baseUrl}/app`)}
      <p style="color: ${BRAND.mutedColor}; font-size: 14px; margin-top: 32px;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // WELCOME FREE - For free registrations
  welcome_free: (data) => ({
    subject: "🎉 ¡Tu cuenta de AdBroll está lista!",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¡Hola${data.name ? ` ${data.name}` : ""}! 👋
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu cuenta gratuita de <strong>AdBroll</strong> está lista. Ya puedes explorar la plataforma.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: ${BRAND.mutedColor}; font-weight: 600;">Con tu cuenta gratuita puedes:</p>
        <ul style="color: ${BRAND.textColor}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Ver los Top 20 videos del día</li>
          <li>Explorar productos trending</li>
          <li>Conocer a los mejores creadores</li>
        </ul>
      </div>
      <div style="background: linear-gradient(135deg, #FDF2F8, #FCE7F3); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #FBCFE8;">
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: ${BRAND.primaryColor};">
          ✨ Desbloquea todas las funciones
        </p>
        <p style="margin: 0; font-size: 14px; color: ${BRAND.textColor};">
          Con AdBroll Pro accedes a guiones transcritos, análisis de scripts, variantes de hooks y mucho más.
        </p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Explorar Dashboard", `${BRAND.baseUrl}/app`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 14px; margin-top: 32px; text-align: center;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // ABANDONED CART - 24h after email capture without conversion
  abandoned_cart: (data) => ({
    subject: "📊 Tus videos rentables te esperan",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¿Te quedaste con ganas de más?
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Notamos que empezaste a explorar AdBroll pero no completaste tu suscripción.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: ${BRAND.mutedColor}; font-weight: 600;">
          Esto es lo que te estás perdiendo:
        </p>
        <ul style="color: ${BRAND.textColor}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>🎯 Guiones transcritos de videos que VENDEN</li>
          <li>📈 Análisis de estructura de scripts exitosos</li>
          <li>🔄 Generación de variantes de hooks con IA</li>
          <li>💎 Descubridor de productos oportunidad</li>
        </ul>
      </div>
      ${data.hasDiscount === 'true' ? `
        <div style="background: linear-gradient(135deg, #DCFCE7, #D1FAE5); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #86EFAC; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #166534;">
            🎉 Tu código de 50% OFF sigue activo
          </p>
        </div>
      ` : ''}
      <div style="text-align: center;">
        ${ctaButton("Completar mi suscripción", `${BRAND.baseUrl}/pricing`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        ¿Preguntas? Responde a este email y te ayudamos.
      </p>
    `),
  }),

  // FREE USER REMINDER - 3 days after registration without subscription
  free_user_reminder: (data) => ({
    subject: "💡 ¿Ya viste estos videos rentables?",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Hola${data.name ? ` ${data.name}` : ""} 👋
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Han pasado unos días desde que creaste tu cuenta. ¿Ya exploraste todas las funciones?
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${BRAND.mutedColor};">Esta semana en AdBroll:</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${BRAND.textColor};">
          +50 nuevos videos analizados
        </p>
        <p style="margin: 8px 0 0; font-size: 14px; color: ${BRAND.mutedColor};">
          Productos nuevos, creadores top, y scripts que están vendiendo HOY
        </p>
      </div>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Con <strong>AdBroll Pro</strong> puedes ver los guiones completos de cada video y generar tus propias versiones.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver qué hay de nuevo", `${BRAND.baseUrl}/app`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // RENEWAL REMINDER - 3 days before subscription renewal
  renewal_reminder: (data) => ({
    subject: "🔄 Tu suscripción se renueva pronto",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Recordatorio de renovación
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu suscripción a <strong>AdBroll Pro</strong> se renovará automáticamente en 3 días.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 14px; color: ${BRAND.mutedColor};">Plan:</td>
            <td style="font-size: 14px; color: ${BRAND.textColor}; font-weight: 600; text-align: right;">AdBroll Pro</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: ${BRAND.mutedColor}; padding-top: 8px;">Monto:</td>
            <td style="font-size: 14px; color: ${BRAND.textColor}; font-weight: 600; text-align: right; padding-top: 8px;">$${data.price || "29"} USD/mes</td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: ${BRAND.mutedColor}; padding-top: 8px;">Fecha de renovación:</td>
            <td style="font-size: 14px; color: ${BRAND.textColor}; font-weight: 600; text-align: right; padding-top: 8px;">${data.renewDate || "Próximamente"}</td>
          </tr>
        </table>
      </div>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        No tienes que hacer nada. Tu acceso continuará sin interrupción.
      </p>
      <p style="color: ${BRAND.mutedColor}; font-size: 14px; margin-top: 24px;">
        Si deseas cancelar o modificar tu suscripción, puedes hacerlo desde tu <a href="${BRAND.baseUrl}/settings" style="color: ${BRAND.primaryColor};">configuración</a>.
      </p>
    `),
  }),

  subscription_confirmed: (data) => ({
    subject: "✅ ¡Tu suscripción a AdBroll Pro está activa!",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">✅</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Pago confirmado!
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Tu suscripción a <strong>AdBroll Pro</strong> ($${data.price || "29"} USD/mes) está activa.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${BRAND.mutedColor};">Ahora tienes acceso a:</p>
        <ul style="color: ${BRAND.textColor}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>✨ Guiones transcritos con IA</li>
          <li>🎯 Análisis de estructura de scripts</li>
          <li>🔄 Generación de variantes de hooks</li>
          <li>💎 Descubridor de oportunidades</li>
          <li>🛠️ Herramientas de creación</li>
        </ul>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Ir al Dashboard", `${BRAND.baseUrl}/app`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Tu suscripción se renovará automáticamente cada mes.<br>
        Puedes cancelar en cualquier momento desde <a href="${BRAND.baseUrl}/settings" style="color: ${BRAND.primaryColor};">Configuración</a>.
      </p>
    `),
  }),

  subscription_cancelled: (data) => ({
    subject: "Tu suscripción a AdBroll Pro ha sido cancelada",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        Suscripción cancelada
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu suscripción a AdBroll Pro ha sido cancelada.
      </p>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Aún tendrás acceso a las funciones Pro hasta el final de tu período actual.
      </p>
      <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 14px; color: #92400E;">
          <strong>¿Cambiaste de opinión?</strong><br>
          Puedes reactivar tu suscripción en cualquier momento.
        </p>
      </div>
      ${ctaButton("Reactivar suscripción", `${BRAND.baseUrl}/pricing`)}
    `),
  }),

  payment_failed: (data) => ({
    subject: "⚠️ Problema con tu pago de AdBroll",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #FEE2E2; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">⚠️</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        No pudimos procesar tu pago
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hubo un problema al procesar el pago de tu suscripción.
      </p>
      <div style="background: #FEF2F2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #EF4444;">
        <p style="margin: 0; font-size: 14px; color: #991B1B;">
          <strong>Acción requerida:</strong><br>
          Por favor actualiza tu método de pago para evitar la interrupción del servicio.
        </p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Actualizar método de pago", `${BRAND.baseUrl}/settings`)}
      </div>
    `),
  }),

  account_setup: (data) => ({
    subject: "🎉 Configura tu cuenta de AdBroll Pro",
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">🎉</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Tu pago fue exitoso!
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Tu suscripción está activa. Haz clic abajo para configurar tu contraseña.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Configurar mi cuenta", data.setupLink || `${BRAND.baseUrl}/checkout/success`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        O inicia sesión con Google usando <strong>${data.email}</strong>
      </p>
    `),
  }),

  affiliate_commission: (data) => ({
    subject: `💰 ¡Ganaste $${data.amount} en comisión!`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">💰</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Nueva comisión!
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Un usuario referido acaba de pagar su suscripción.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${BRAND.mutedColor};">Comisión ganada</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10B981;">$${data.amount} USD</p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Ver mis ganancias", `${BRAND.baseUrl}/affiliates`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Los pagos se procesan cada miércoles (mínimo $50 USD).
      </p>
    `),
  }),

  // BRAND REGISTERED - When a brand creates their profile
  brand_registered: (data) => ({
    subject: "🏢 ¡Tu perfil de marca está listo!",
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¡Bienvenido${data.name ? ` ${data.name}` : ""}! 🎉
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Tu perfil de marca ha sido creado exitosamente en <strong>AdBroll</strong>.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: ${BRAND.mutedColor}; font-weight: 600;">Ahora puedes:</p>
        <ul style="color: ${BRAND.textColor}; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>📹 Crear campañas de UGC</li>
          <li>👥 Recibir videos de creadores</li>
          <li>✅ Aprobar y pagar por contenido</li>
          <li>🚀 Obtener SparkCodes para ads</li>
        </ul>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Crear mi primera campaña", `${BRAND.baseUrl}/brand/campaigns`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 14px; margin-top: 32px; text-align: center;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // CAMPAIGN NEW - When a brand creates a new campaign
  campaign_new: (data) => ({
    subject: `🎬 Tu campaña "${data.campaign}" está lista`,
    html: emailWrapper(`
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700;">
        ¡Campaña creada! 🎬
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Hola ${data.name || ""},
      </p>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu campaña <strong>"${data.campaign}"</strong> ha sido creada exitosamente.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 14px; color: ${BRAND.mutedColor};">Presupuesto por video:</td>
            <td style="font-size: 14px; color: ${BRAND.textColor}; font-weight: 600; text-align: right;">
              ${data.min_payment} - ${data.max_payment} MXN
            </td>
          </tr>
        </table>
      </div>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Publica tu campaña para que los creadores empiecen a enviarte videos.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver mi campaña", data.cta_url || `${BRAND.baseUrl}/brand/campaigns`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 14px; margin-top: 32px; text-align: center;">
        — El equipo de AdBroll
      </p>
    `),
  }),

  // VIDEO APPROVED - When a brand approves a creator's video
  video_approved: (data) => ({
    subject: `✅ ¡Tu video fue aprobado!`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">✅</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Video aprobado!
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hola ${data.name || ""}, tu video para la campaña <strong>"${data.campaign}"</strong> ha sido aprobado por la marca.
      </p>
      <div style="background: linear-gradient(135deg, #DCFCE7, #D1FAE5); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #86EFAC; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #166534; font-weight: 600;">
          🎉 Siguiente paso: Enviar SparkCode
        </p>
        <p style="margin: 0; font-size: 14px; color: #166534;">
          Genera tu SparkCode en TikTok y envíalo para completar el proceso.
        </p>
      </div>
      <div style="text-align: center;">
        ${ctaButton("Enviar SparkCode", data.cta_url || `${BRAND.baseUrl}/my-submissions`)}
      </div>
      <p style="color: ${BRAND.mutedColor}; font-size: 13px; margin-top: 32px; text-align: center;">
        Una vez que envíes el SparkCode, recibirás tu pago.
      </p>
    `),
  }),

  // VIDEO PURCHASED - When a brand purchases/pays for a video
  video_purchased: (data) => ({
    subject: `💰 ¡Recibiste un pago de ${data.price}!`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #DCFCE7; border-radius: 50%; padding: 16px;">
          <span style="font-size: 32px;">💰</span>
        </div>
      </div>
      <h1 style="color: ${BRAND.textColor}; font-size: 28px; margin: 0 0 16px; font-weight: 700; text-align: center;">
        ¡Pago recibido!
      </h1>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Hola ${data.name || ""}, la marca ha pagado por tu video en la campaña <strong>"${data.campaign}"</strong>.
      </p>
      <div style="background: #F1F5F9; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 14px; color: ${BRAND.mutedColor};">Monto recibido</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10B981;">${data.price}</p>
      </div>
      <p style="color: ${BRAND.textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 16px; text-align: center;">
        ¡Gracias por tu contenido! Sigue creando para ganar más.
      </p>
      <div style="text-align: center;">
        ${ctaButton("Ver mis pagos", `${BRAND.baseUrl}/my-submissions`)}
      </div>
    `),
  }),
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    
    // Mode 1: Resend Template API (template_id + template_data)
    if (body.template_id) {
      console.log(`Sending email via Resend template: ${body.template_id} to ${body.to}`);
      
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: body.from || BRAND.fromEmail,
          to: [body.to],
          subject: body.subject || "", // Resend templates include subject
          react: undefined,
          html: undefined,
          // Resend uses dynamic data in templates
          ...(body.template_data && Object.keys(body.template_data).length > 0 
            ? { headers: { "X-Entity-Ref-ID": body.template_id } } 
            : {}),
        }),
      });

      // Note: Resend doesn't currently support template_id via REST API directly
      // We'll use the inline template approach with template_id as key
      const templateKey = body.template_id.replace(/-/g, '_');
      if (templates[templateKey]) {
        const templateResult = templates[templateKey](body.template_data || {});
        const sendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: body.from || BRAND.fromEmail,
            to: [body.to],
            subject: templateResult.subject,
            html: templateResult.html,
          }),
        });

        const data = await sendResponse.json();
        if (!sendResponse.ok) {
          console.error("Resend error:", data);
          return new Response(
            JSON.stringify({ error: data }),
            { status: sendResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        console.log(`Email sent to ${body.to}: ${templateResult.subject}`);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }
    
    let subject: string;
    let html: string;

    // Mode 2: Inline template (template + templateData)
    if (body.template && templates[body.template]) {
      const templateResult = templates[body.template](body.templateData || {});
      subject = templateResult.subject;
      html = templateResult.html;
    } else if (body.subject && body.html) {
      // Mode 3: Direct HTML (subject + html)
      subject = body.subject;
      html = body.html;
    } else {
      return new Response(
        JSON.stringify({ error: "Missing required fields: (template_id) or (template) or (subject + html)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: body.from || BRAND.fromEmail,
        to: [body.to],
        subject,
        html,
      }),
    });

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({ error: data }),
        { status: emailResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email sent to ${body.to}: ${subject}`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
