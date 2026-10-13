import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play, Check, Clapperboard, ScanLine, Wallet, ArrowRight } from "lucide-react";
import { BrandContactLinks } from "@/components/BrandContactLinks";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import { useCreatorLifetimeCapacity } from "@/hooks/useCreatorLifetimeCapacity";
import { CreatorLifetimeCapacity } from "@/components/creators/CreatorLifetimeCapacity";
import "./partner-landing.css";

export default function PartnerLanding() {
  const lifetimeCapacity = useCreatorLifetimeCapacity();
  const [referrals, setReferrals] = useState(10);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.search);
  const leader = /^[a-zA-Z0-9]{4,12}$/.test(params.get("leader") || "") ? params.get("leader")!.toUpperCase() : null;
  const code = leader ? null : params.get("ref") || getStoredRefCode();
  const register = (destination: string) => `/register?redirect=${encodeURIComponent(destination)}${code ? `&ref=${encodeURIComponent(code)}` : ""}`;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Recomienda TokXray · 15% recurrente para creadores";
    // Public asset managed by the founder from the admin panel.
    const { data } = supabase.storage.from("assets").getPublicUrl("creator-program/presentation.mp4");
    setVideoUrl(data.publicUrl);
    return () => { document.title = previousTitle; };
  }, []);
  return <div className="partner-page">
    <header className="partner-nav partner-wrap">
      <Link to="/" aria-label="TokXray, inicio"><BrandLogo tone="light" size="md" /></Link>
      <nav aria-label="Navegación del programa"><a href="#como-funciona">Cómo funciona</a><Link to={`/login?redirect=${encodeURIComponent(leader ? `/affiliates?leader=${leader}` : "/affiliates")}`}>Entrar <ArrowUpRight size={16} /></Link></nav>
    </header>
    <main>
      <section className="partner-hero partner-wrap">
        <div>
          <p className="partner-eyebrow"><span /> PARA CREADORES DE TIKTOK SHOP MÉXICO</p>
          <h1>Recomienda TokXray.<br />Gana el <em>15% cada mes.</em></h1>
          <p className="partner-intro">Aprende qué grabar con ejemplos de TikTok Shop. Comparte TokXray con otros creadores y gana <strong>$10 USD por su primer pago y 15% de sus renovaciones</strong> mientras sigan suscritos.</p>
          <div className="partner-actions"><Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Quiero recomendar TokXray <ArrowUpRight size={20} /></Link><Link className="partner-text-link" to={register("/pricing")}>Quiero usar la herramienta <ArrowRight size={17} /></Link></div>
          <p className="partner-caption">Crea tu cuenta y conoce el programa. No necesitas experiencia previa.</p>
          <div className="mt-6"><CreatorLifetimeCapacity state={lifetimeCapacity} tone="dark" compact /></div>
          <a className="partner-text-link mt-3" href="#acceso-vitalicio">{lifetimeCapacity.capacity?.is_open === false ? 'Ver cierre del acceso vitalicio' : 'Conoce cómo conseguir tu acceso vitalicio'} <ArrowRight size={17} /></a>
          {leader && <p className="partner-caption">Te invita la comunidad <strong>{leader}</strong>. Al crear tu cuenta podrás revisar y aceptar la invitación; registrarte no te vincula automáticamente.</p>}
        </div>
        <aside className="partner-ticket" aria-label="Comisión por renovación">
          <div className="partner-ticket-top"><span>TU RECOMENDACIÓN CUENTA</span><ArrowUpRight size={26} /></div>
          <div className="partner-ticket-number">15<span>%</span></div>
          <p>Comisión recurrente.<br />Sin límite de seis meses.</p>
          <div className="partner-ticket-bottom"><strong>$4.35 USD</strong><span>por cada renovación<br />cobrada de $29 USD</span></div>
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
        <div><p className="partner-eyebrow">HAZ TUS NÚMEROS</p><h2>Una recomendación.<br />Más de una comisión.</h2><p>Si alguien se suscribe con tu código, paga $29 USD al mes desde el inicio. Recibes $10 USD del primer pago y $4.35 USD de cada renovación cobrada.</p><p>Las comisiones dependen de pagos reales. Este ejemplo no garantiza resultados.</p></div>
        <div className="partner-calculator-card"><label htmlFor="referrals">Referidos que renuevan <strong>{referrals}</strong></label><input id="referrals" type="range" min="1" max="100" value={referrals} onChange={e => setReferrals(Number(e.target.value))} /><output htmlFor="referrals">${(referrals * 4.35).toFixed(2)}<span> USD / mes</span></output><p>{referrals} renovaciones de $29 USD × 15%. Sin impuestos, reembolsos ni pagos fallidos en este ejemplo.</p><div className="partner-rule"><Check size={17} /> Mínimo de retiro: $50 USD</div><div className="partner-rule"><Check size={17} /> Procesamiento semanal del saldo disponible</div></div>
      </div></section>
      <section className="partner-wrap partner-how" style={{ paddingTop: 64 }}>
        <div className="partner-section-head"><p className="partner-eyebrow">CRECE CON TU COMUNIDAD</p><h2>Invita creadores.<br />Acompaña sus primeros pasos.</h2><p>Cada creador tiene su código y conserva US$10 por cada primer pago y 15% de sus renovaciones. Si acepta tu invitación de comunidad, tú recibes 5% de las renovaciones de sus clientes directos: US$1.45 por cada renovación completa de US$29.</p></div>
        <p className="partner-caption">Ejemplo: 10 clientes que renuevan generan US$43.50 para el creador y US$14.50 para su líder. No se paga por incorporar creadores ni por una primera compra indirecta. Las comisiones requieren pagos reales elegibles.</p>
        <Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Crear mi comunidad <ArrowUpRight size={20} /></Link>
      </section>
      <section id="acceso-vitalicio" className="partner-wrap partner-how scroll-mt-8">
        <div className="partner-section-head"><p className="partner-eyebrow">SOLO LOS PRIMEROS 100 CREADORES APROBADOS</p><h2>{lifetimeCapacity.capacity?.is_open === false ? <>Los 100 accesos<br />ya fueron otorgados.</> : <>Tres videos.<br />Tu acceso vitalicio.</>}</h2><p>Esta oferta se cierra al otorgar 100 accesos. Publica tres videos originales sobre TokXray y autoriza su uso en pauta durante 12 meses. Si tus entregables son aprobados y todavía hay cupo, activamos tu acceso personal mientras TokXray opere. Conservas tu código y tus comisiones; no necesitas traer clientes para conservar ese acceso.</p></div>
        <div className="mb-6 max-w-xl"><CreatorLifetimeCapacity state={lifetimeCapacity} tone="dark" /></div>
        {lifetimeCapacity.capacity?.is_open && !lifetimeCapacity.error ? <Link className="partner-button" to={register("/colaboraciones")}>Quiero ser uno de los 100 <ArrowUpRight size={20} /></Link> : <Link className="partner-text-link" to="/colaboraciones">{lifetimeCapacity.capacity?.is_open === false ? 'Consultar mi solicitud o acceso' : 'Consultar disponibilidad'} <ArrowRight size={17} /></Link>}
        <p className="partner-caption">Crear tu cuenta, recibir una prueba o enviar los enlaces no reserva una plaza. Se asigna al aprobar los tres videos y el permiso de pauta. El programa de comisiones sigue disponible aunque se agoten los accesos gratuitos.</p>
      </section>
      <section className="partner-wrap partner-faq"><div><p className="partner-eyebrow">LAS REGLAS, CLARAS</p><h2>Antes de comenzar.</h2></div><div>{[
        ["¿Tengo que ser un creador experto?", "No. TokXray está pensado también para quienes empiezan: referencias, productos y guiones para entender cómo presentar una oferta. Tu contenido y tus resultados siguen dependiendo de ti."],
        ["¿Cuánto cuesta usar TokXray?", "$29 USD al mes desde el primer mes, con o sin código. El código reconoce al creador que te invitó; no cambia el precio. El checkout muestra los impuestos aplicables."],
        ["¿Durante cuánto tiempo gano comisiones?", "Recibes hasta $10 USD por el primer pago de cada cliente nuevo y 15% de las renovaciones elegibles de tus referidos directos mientras su suscripción continúe pagando. No hay un límite de seis meses. No se generan comisiones por registros gratuitos, pagos fallidos o cobros reembolsados."],
        ["¿Gano por los referidos de mis referidos?", "Si invitas a un creador y acepta unirse a tu comunidad antes de generar clientes de pago, recibes 5% de las renovaciones elegibles de sus clientes directos. Ese creador conserva su 15%. Es un solo escalón: no ganas por niveles más profundos ni por registros gratuitos."],
        ["¿Cómo recibo mi dinero?", "El equipo de TokXray revisa los saldos semanalmente y te contacta para coordinar una transferencia manual cuando alcanzas $50 USD disponibles. Los depósitos confirmados aparecen en tu historial; no necesitas una cuenta de Stripe."],
        ["¿Los datos se actualizan en tiempo real?", "Actualizamos el catálogo semanalmente con reportes sobre TikTok Shop México. Consulta el periodo de cada ranking: son referencias históricas, no una garantía de ventas futuras. Algunos videos pueden dejar de estar disponibles."],
      ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section className="partner-final partner-wrap"><p className="partner-eyebrow">TU SIGUIENTE PASO</p><h2>Empieza aprendiendo.<br />Crece compartiendo.</h2><Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Crear mi cuenta <ArrowUpRight size={20} /></Link><p>¿Buscas ideas para tus propios videos? <Link to="/app">Explora el catálogo.</Link></p></section>
    </main>
    <footer className="partner-footer partner-wrap"><BrandLogo tone="light" size="sm" /><span>© {new Date().getFullYear()} TokXray</span><Link to="/terminos-afiliados">Condiciones del programa</Link><Link to="/privacy">Privacidad</Link><Link to="/pricing">Precios</Link><BrandContactLinks className="w-full" /></footer>
  </div>;
}
