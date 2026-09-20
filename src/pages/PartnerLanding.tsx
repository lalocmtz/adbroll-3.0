import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play, Check, Clapperboard, ScanLine, Wallet, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import "./partner-landing.css";

export default function PartnerLanding() {
  const [referrals, setReferrals] = useState(10);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const code = new URLSearchParams(window.location.search).get("ref") || getStoredRefCode();
  const register = (destination: string) => `/register?redirect=${encodeURIComponent(destination)}${code ? `&ref=${encodeURIComponent(code)}` : ""}`;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Recomienda TokXray · 30% recurrente para creadores";
    // Public asset managed by the founder from the admin panel.
    const { data } = supabase.storage.from("assets").getPublicUrl("creator-program/presentation.mp4");
    setVideoUrl(data.publicUrl);
    return () => { document.title = previousTitle; };
  }, []);
  return <div className="partner-page">
    <header className="partner-nav partner-wrap">
      <Link to="/" aria-label="TokXray, inicio"><BrandLogo tone="light" size="md" /></Link>
      <nav aria-label="Navegación del programa"><a href="#como-funciona">Cómo funciona</a><Link to="/login?redirect=%2Faffiliates">Entrar <ArrowUpRight size={16} /></Link></nav>
    </header>
    <main>
      <section className="partner-hero partner-wrap">
        <div>
          <p className="partner-eyebrow"><span /> PARA CREADORES DE TIKTOK SHOP MÉXICO</p>
          <h1>Recomienda TokXray.<br />Gana el <em>30% cada mes.</em></h1>
          <p className="partner-intro">Aprende qué grabar con ejemplos de TikTok Shop. Comparte TokXray con otros creadores y gana el <strong>30% de sus pagos</strong> mientras sigan suscritos.</p>
          <div className="partner-actions"><Link className="partner-button" to={register("/affiliates")}>Quiero recomendar TokXray <ArrowUpRight size={20} /></Link><Link className="partner-text-link" to={register("/pricing")}>Quiero usar la herramienta <ArrowRight size={17} /></Link></div>
          <p className="partner-caption">Crea tu cuenta y conoce el programa. No necesitas experiencia previa.</p>
        </div>
        <aside className="partner-ticket" aria-label="Comisión por renovación">
          <div className="partner-ticket-top"><span>TU RECOMENDACIÓN CUENTA</span><ArrowUpRight size={26} /></div>
          <div className="partner-ticket-number">30<span>%</span></div>
          <p>Comisión recurrente.<br />Sin límite de seis meses.</p>
          <div className="partner-ticket-bottom"><strong>$9 USD</strong><span>por cada renovación<br />cobrada de $30 USD</span></div>
        </aside>
      </section>
      <section className="partner-video-section partner-wrap" aria-labelledby="presentation-title">
        <div className="partner-section-head"><p className="partner-eyebrow">CONOCE LA IDEA</p><h2 id="presentation-title">De creador a creador.</h2><p>Qué hace TokXray, cómo puedes aprovecharlo y cómo funciona tu comisión.</p></div>
        <div className="partner-video">
          {videoUrl && !videoFailed ? <video controls playsInline preload="metadata" src={videoUrl} onError={() => setVideoFailed(true)} aria-label="Presentación del programa TokXray" /> : <div className="partner-video-empty"><Clapperboard size={44} /><h3>La presentación está en camino.</h3><p>Mientras tanto, descubre el programa aquí abajo.</p><a href="#como-funciona">Ver cómo funciona <ArrowRight size={18} /></a></div>}
        </div>
      </section>
      <section id="como-funciona" className="partner-how partner-wrap">
        <div className="partner-section-head"><p className="partner-eyebrow">EMPIEZA CON ALGO CONCRETO</p><h2>Primero entiende el video.<br />Después hazlo tuyo.</h2><p>No necesitas adivinar por dónde empezar. Usa el catálogo como referencia para preparar tu siguiente contenido.</p></div>
        <div className="partner-steps">{[
          ["01", "Encuentra una referencia", "Explora videos y productos de México. Compara sus resultados dentro del periodo mostrado.", <Play size={24} />],
          ["02", "Prepara tu versión", "Revisa los guiones y análisis disponibles. Adapta el gancho, la demostración y el cierre a tu producto y tu voz.", <ScanLine size={24} />],
          ["03", "Comparte lo que te sirve", "Obtén tu enlace y código de afiliado. Invita a otros creadores y consulta tus referidos y comisiones en tu panel.", <Wallet size={24} />],
        ].map(([number, title, body, icon]) => <article key={String(number)}><div className="partner-step-top"><span>{number}</span>{icon}</div><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>
      <section className="partner-calculator-band"><div className="partner-wrap partner-calculator">
        <div><p className="partner-eyebrow">HAZ TUS NÚMEROS</p><h2>Una recomendación.<br />Más de una comisión.</h2><p>Si alguien se suscribe con tu código, paga $15 USD el primer mes y después $30 USD al mes. Recibes $4.50 USD del primer pago y $9 USD de cada renovación cobrada.</p><p>Las comisiones dependen de pagos reales. Este ejemplo no garantiza resultados.</p></div>
        <div className="partner-calculator-card"><label htmlFor="referrals">Referidos que renuevan <strong>{referrals}</strong></label><input id="referrals" type="range" min="1" max="100" value={referrals} onChange={e => setReferrals(Number(e.target.value))} /><output htmlFor="referrals">${referrals * 9}<span> USD / mes</span></output><p>{referrals} renovaciones de $30 USD × 30%. Sin impuestos, reembolsos ni pagos fallidos en este ejemplo.</p><div className="partner-rule"><Check size={17} /> Mínimo de retiro: $50 USD</div><div className="partner-rule"><Check size={17} /> Procesamiento semanal del saldo disponible</div></div>
      </div></section>
      <section className="partner-wrap partner-faq"><div><p className="partner-eyebrow">LAS REGLAS, CLARAS</p><h2>Antes de comenzar.</h2></div><div>{[
        ["¿Tengo que ser un creador experto?", "No. TokXray está pensado también para quienes empiezan: referencias, productos y guiones para entender cómo presentar una oferta. Tu contenido y tus resultados siguen dependiendo de ti."],
        ["¿Cuánto cuesta usar TokXray?", "$30 USD al mes. Los clientes nuevos con un código de afiliado válido obtienen 50% de descuento en su primer mes: $15 USD. Después, $30 USD al mes hasta cancelar. El checkout muestra los impuestos aplicables."],
        ["¿Durante cuánto tiempo gano comisiones?", "Recibes 30% de los pagos elegibles de tus referidos directos mientras su suscripción continúe pagando. No hay un límite de seis meses. No se generan comisiones por registros gratuitos, pagos fallidos o cobros reembolsados."],
        ["¿Gano por los referidos de mis referidos?", "La comisión corresponde únicamente a las suscripciones que tú recomiendas directamente. No existen niveles adicionales ni pagos por reclutar afiliados."],
        ["¿Cómo recibo mi dinero?", "Conecta y verifica tu cuenta de cobro con Stripe desde tu panel. El saldo disponible se procesa semanalmente cuando alcanza $50 USD. El tiempo de llegada a tu banco depende de Stripe y de tu entidad bancaria."],
        ["¿Los datos se actualizan en tiempo real?", "Actualizamos el catálogo mediante importaciones de Kalodata. Consulta el periodo de cada ranking: son referencias históricas, no una garantía de ventas futuras. Algunos videos pueden dejar de estar disponibles."],
      ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section className="partner-final partner-wrap"><p className="partner-eyebrow">TU SIGUIENTE PASO</p><h2>Empieza aprendiendo.<br />Crece compartiendo.</h2><Link className="partner-button" to={register("/affiliates")}>Crear mi cuenta <ArrowUpRight size={20} /></Link><p>¿Buscas ideas para tus propios videos? <Link to="/app">Explora el catálogo.</Link></p></section>
    </main>
    <footer className="partner-footer partner-wrap"><BrandLogo tone="light" size="sm" /><span>© {new Date().getFullYear()} TokXray</span><Link to="/terminos-afiliados">Condiciones del programa</Link><Link to="/privacy">Privacidad</Link><Link to="/pricing">Precios</Link></footer>
  </div>;
}
