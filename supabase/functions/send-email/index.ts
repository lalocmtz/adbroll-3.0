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
  subject: string;
  html: string;
  from?: string;
  // Pre-built template support
  template?: string;
  templateData?: Record<string, string>;
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
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    
    let subject: string;
    let html: string;

    // Check if using template or direct HTML
    if (body.template && templates[body.template]) {
      const templateResult = templates[body.template](body.templateData || {});
      subject = templateResult.subject;
      html = templateResult.html;
    } else if (body.subject && body.html) {
      subject = body.subject;
      html = body.html;
    } else {
      return new Response(
        JSON.stringify({ error: "Missing required fields: (template) or (subject + html)" }),
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