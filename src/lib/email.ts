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

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: "¡Bienvenido a AdBroll!",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 28px; margin-bottom: 24px;">¡Hola ${name}!</h1>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Bienvenido a AdBroll, tu plataforma de análisis para TikTok Shop.
        </p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Ahora tienes acceso a:
        </p>
        <ul style="color: #334155; font-size: 16px; line-height: 1.8;">
          <li>Videos top con sus guiones transcritos</li>
          <li>Análisis de productos con mejores comisiones</li>
          <li>Generación de variantes de guiones con IA</li>
        </ul>
        <a href="https://adbroll.com/app" 
           style="display: inline-block; background: #F31260; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">
          Explorar Dashboard
        </a>
        <p style="color: #64748B; font-size: 14px; margin-top: 40px;">
          — El equipo de AdBroll
        </p>
      </div>
    `,
  }),

  subscriptionConfirmation: (planName: string) => ({
    subject: `Tu suscripción a ${planName} está activa`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 28px; margin-bottom: 24px;">¡Gracias por suscribirte!</h1>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Tu suscripción al plan <strong>${planName}</strong> ya está activa.
        </p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Ya tienes acceso completo a todas las funcionalidades de AdBroll.
        </p>
        <a href="https://adbroll.com/app" 
           style="display: inline-block; background: #F31260; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">
          Ir al Dashboard
        </a>
        <p style="color: #64748B; font-size: 14px; margin-top: 40px;">
          ¿Tienes preguntas? Responde a este correo o visita nuestra sección de soporte.
        </p>
      </div>
    `,
  }),

  passwordReset: (resetLink: string) => ({
    subject: "Restablecer tu contraseña de AdBroll",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #0F172A; font-size: 28px; margin-bottom: 24px;">Restablecer contraseña</h1>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Recibimos una solicitud para restablecer tu contraseña.
        </p>
        <a href="${resetLink}" 
           style="display: inline-block; background: #F31260; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">
          Restablecer Contraseña
        </a>
        <p style="color: #64748B; font-size: 14px; margin-top: 40px;">
          Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
      </div>
    `,
  }),
};
