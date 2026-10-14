import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SubscriptionOffer } from '@/components/SubscriptionOffer';

export default function Pricing() {
  return <div className="min-h-[100svh] bg-[#f7f8fa] text-slate-950">
    <header className="mx-auto flex max-w-4xl items-center justify-between px-4 h-14">
      <Link to="/app" className="inline-flex min-h-11 items-center gap-1 text-xs text-slate-600"><ArrowLeft className="h-4 w-4" />Explorar</Link>
      <Link to="/" aria-label="TokXray, inicio"><BrandLogo tone="dark" size="sm" /></Link>
      <Link to="/login?redirect=%2Fpricing" className="inline-flex min-h-11 items-center text-xs text-slate-600">Mi cuenta</Link>
    </header>
    <main className="mx-auto max-w-4xl px-4 pb-6 pt-2 sm:pt-12">
      <div className="grid md:grid-cols-2 md:items-center gap-4 md:gap-12">
        <div className="text-center md:text-left">
          <h1 className="text-[26px] sm:text-4xl font-bold leading-tight tracking-tight">Deja de grabar a ciegas.<br /><span className="text-[#e92350]">Elige qué vas a probar.</span></h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">No tienes que empezar cada video desde cero. Elige una referencia con ventas reportadas, adapta su guion y graba con tu estilo.</p>
          <p className="hidden md:block mt-6 text-xs text-slate-500">1. Crea tu cuenta · 2. Confirma tu correo · 3. Activa Pro<br />Con Google, continúa con tu cuenta verificada.</p>
        </div>
        <SubscriptionOffer />
      </div>
      <details className="mx-auto md:ml-auto md:mr-0 md:w-[calc(50%-1.5rem)] mt-4 text-xs text-slate-600">
        <summary className="cursor-pointer min-h-11 flex items-center justify-center underline underline-offset-4">Cómo funciona tu acceso</summary>
        <div className="space-y-3 rounded-xl border bg-white p-4 leading-relaxed"><p><strong>Tu cuenta es gratis.</strong> Puedes explorar la vista previa sin tarjeta y tener tu código de afiliado. Los guiones, las métricas completas y el análisis con IA requieren Pro.</p><p><strong>Tú decides cuándo pagar.</strong> Si te registras con correo, primero lo confirmas. Después revisas el precio y autorizas la suscripción en Stripe. El análisis con IA tiene límites de uso. Los datos de ventas provienen de reportes semanales de TikTok Shop México; consulta siempre el período. Son referencias para decidir qué probar, no una garantía de ventas.</p><p><strong>También puedes recomendar.</strong> Gana US$10 por el primer pago válido de cada referido directo y 15% de sus renovaciones elegibles. <Link className="underline" to="/programa-creadores">Conoce el programa</Link>.</p><p><Link className="underline" to="/terms">Términos</Link> · <Link className="underline" to="/refund-policy">Reembolsos</Link> · <Link className="underline" to="/support">Ayuda</Link></p></div>
      </details>
    </main>
  </div>;
}
