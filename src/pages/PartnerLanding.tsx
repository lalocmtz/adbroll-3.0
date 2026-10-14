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
    document.title = "Comparte una forma de grabar con intención · TokXray";
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
          <h1>Ayuda a otros creadores<br />a <em>dejar de adivinar.</em></h1>
          <p className="partner-intro">Elegir qué vender y qué decir es más fácil con una referencia. Muestra cómo usas TokXray para revisar ventas reportadas y adaptar un guion. Si un cliente nuevo se suscribe con tu código, recibes <strong>US$10 por su primer pago y 15% de sus renovaciones elegibles</strong>.</p>
          <div className="partner-actions"><Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Quiero recomendar TokXray <ArrowUpRight size={20} /></Link><Link className="partner-text-link" to={register("/pricing")}>Quiero usar la herramienta <ArrowRight size={17} /></Link></div>
          <p className="partner-caption">Tu cuenta y tu código son gratis. El acceso Pro se contrata por separado.</p>
          <div className="mt-6"><CreatorLifetimeCapacity state={lifetimeCapacity} tone="dark" compact /></div>
          <a className="partner-text-link mt-3" href="#acceso-vitalicio">{lifetimeCapacity.capacity?.is_open === false ? 'Ver cierre del acceso vitalicio' : 'Conoce cómo conseguir tu acceso vitalicio'} <ArrowRight size={17} /></a>
          {leader && <p className="partner-caption">Te invita la comunidad <strong>{leader}</strong>. Al crear tu cuenta podrás revisar y aceptar la invitación; registrarte no te vincula automáticamente.</p>}
        </div>
        <aside className="partner-ticket" aria-label="Comisión por renovación">
          <div className="partner-ticket-top"><span>TU RECOMENDACIÓN CUENTA</span><ArrowUpRight size={26} /></div>
          <div className="partner-ticket-number">15<span>%</span></div>
          <p>Por renovaciones pagadas.<br />Sin límite de seis meses.</p>
          <div className="partner-ticket-bottom"><strong>$4.35 USD</strong><span>por cada renovación<br />cobrada de $29 USD</span></div>
        </aside>
      </section>
      <section className="partner-video-section partner-wrap" aria-labelledby="presentation-title">
        <div className="partner-section-head"><p className="partner-eyebrow">MUÉSTRALO CON UN EJEMPLO</p><h2 id="presentation-title">Una referencia. Una decisión más clara.</h2><p>Enseña cómo eliges un producto, revisas un video con ventas reportadas y preparas qué decir antes de grabar.</p></div>
        <div className="partner-video">
          {videoUrl && !videoFailed ? <video controls playsInline preload="metadata" src={videoUrl} onError={() => setVideoFailed(true)} aria-label="Presentación del programa TokXray" /> : <div className="partner-video-empty"><Clapperboard size={44} /><h3>No pudimos cargar el video.</h3><p>Puedes conocer los pasos y las comisiones aquí abajo.</p><a href="#como-funciona">Ver cómo funciona <ArrowRight size={18} /></a></div>}
        </div>
      </section>
      <section id="como-funciona" className="partner-how partner-wrap">
        <div className="partner-section-head"><p className="partner-eyebrow">UNA FORMA DE GRABAR CON INTENCIÓN</p><h2>Elige una referencia.<br />Dale tu voz.</h2><p>No se trata de grabar más por grabar. Compara qué productos tienen ventas reportadas y cómo los presentan otros creadores.</p></div>
        <div className="partner-steps">{[
          ["01", "Elige qué producto explorar", "Busca una referencia con ventas reportadas en TikTok Shop México. Revisa su periodo: esas ventas no son la comisión del creador.", <Play size={24} />],
          ["02", "Decide qué vas a decir", "Con Pro, revisa el guion y su análisis. Entiende los primeros segundos, la demostración y el cierre; adáptalos a tu producto y tu voz.", <ScanLine size={24} />],
          ["03", "Graba, prueba y comparte", "Pon a prueba tu versión. Si TokXray te sirve, muestra tu proceso y comparte tu código para que otros creadores conozcan la herramienta.", <Wallet size={24} />],
        ].map(([number, title, body, icon]) => <article key={String(number)}><div className="partner-step-top"><span>{number}</span>{icon}</div><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>
      <section className="partner-calculator-band"><div className="partner-wrap partner-calculator">
        <div><p className="partner-eyebrow">HAZ TUS NÚMEROS</p><h2>Tu recomendación tiene<br />un pago claro.</h2><p>Si un cliente nuevo se suscribe con tu código, paga $29 USD al mes desde el inicio. Recibes US$10 del primer pago elegible y US$4.35 por cada renovación completa de US$29.</p><p>Las comisiones dependen de pagos reales elegibles. Este ejemplo no garantiza resultados.</p></div>
        <div className="partner-calculator-card"><label htmlFor="referrals">Clientes directos que renuevan <strong>{referrals}</strong></label><input id="referrals" type="range" min="1" max="100" value={referrals} onChange={e => setReferrals(Number(e.target.value))} /><output htmlFor="referrals">${(referrals * 4.35).toFixed(2)}<span> USD / mes</span></output><p>{referrals} renovaciones de $29 USD × 15%. Sin impuestos, reembolsos ni pagos fallidos en este ejemplo.</p><div className="partner-rule"><Check size={17} /> Mínimo de retiro: $50 USD</div><div className="partner-rule"><Check size={17} /> Revisión semanal y transferencia manual</div></div>
      </div></section>
      <section className="partner-wrap partner-how" style={{ paddingTop: 64 }}>
        <div className="partner-section-head"><p className="partner-eyebrow">SI YA ACOMPAÑAS A OTROS CREADORES</p><h2>Enséñales a elegir.<br />Crezcan recomendando.</h2><p>Ayuda a tu comunidad a entender qué producto explorar y cómo preparar un guion. Cada creador conserva US$10 por cada primer pago directo elegible y 15% de sus renovaciones. Si acepta tu invitación de comunidad antes de generar clientes de pago, tú recibes 5% de las renovaciones elegibles de sus clientes directos: US$1.45 por cada renovación completa de US$29.</p></div>
        <p className="partner-caption">Ejemplo ilustrativo: 10 renovaciones completas de US$29 generan US$43.50 para el creador y US$14.50 para su líder. El 15% y el 5% se reparten entre dos personas. Solo hay un escalón indirecto: no se paga por incorporar creadores, por niveles más profundos ni por una primera compra indirecta.</p>
        <Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Crear mi comunidad <ArrowUpRight size={20} /></Link>
      </section>
      <section id="acceso-vitalicio" className="partner-wrap partner-how scroll-mt-8">
        <div className="partner-section-head"><p className="partner-eyebrow">SOLO LOS PRIMEROS 100 CREADORES APROBADOS</p><h2>{lifetimeCapacity.capacity?.is_open === false ? <>Los 100 accesos<br />ya fueron otorgados.</> : <>Muestra tu proceso.<br />Solicita acceso vitalicio.</>}</h2><p>La propuesta es sencilla: tres videos originales publicados que muestren cómo usas TokXray, con permiso para usarlos en anuncios durante 12 meses. Los primeros 100 creadores con videos y permiso aprobados reciben acceso personal mientras TokXray opere. No necesitas traer clientes para conservarlo. Al otorgar los 100 accesos, esta oferta se cierra.</p></div>
        <div className="mb-6 max-w-xl"><CreatorLifetimeCapacity state={lifetimeCapacity} tone="dark" /></div>
        {lifetimeCapacity.capacity?.is_open && !lifetimeCapacity.error ? <Link className="partner-button" to={register("/colaboraciones")}>Ver requisitos y enviar mis videos <ArrowUpRight size={20} /></Link> : <Link className="partner-text-link" to="/colaboraciones">{lifetimeCapacity.capacity?.is_open === false ? 'Consultar mi solicitud o acceso' : 'Consultar disponibilidad'} <ArrowRight size={17} /></Link>}
        <p className="partner-caption">Crear tu cuenta, recibir una prueba o enviar los enlaces no reserva una plaza. Se asigna al aprobar los tres videos y el permiso de pauta. El programa de comisiones sigue disponible aunque se agoten los accesos gratuitos.</p>
      </section>
      <section className="partner-wrap partner-faq"><div><p className="partner-eyebrow">LAS REGLAS, CLARAS</p><h2>Antes de comenzar.</h2></div><div>{[
        ["¿Tengo que ser un creador experto?", "No. Puedes mostrar un ejemplo sencillo: el producto que elegiste, la referencia que revisaste y cómo adaptaste el guion. No necesitas prometer cuánto va a vender alguien ni cuánto va a ganar."],
        ["¿Cuánto cuesta usar TokXray?", "$29 USD al mes desde el primer mes, con o sin código. El código reconoce al creador que te invitó; no cambia el precio. La pantalla de pago muestra los impuestos aplicables."],
        ["¿Durante cuánto tiempo gano comisiones?", "Recibes hasta $10 USD por el primer pago de cada cliente nuevo y 15% de las renovaciones elegibles de tus referidos directos mientras su suscripción continúe pagando. No hay un límite de seis meses. No se generan comisiones por registros gratuitos, pagos fallidos o cobros reembolsados."],
        ["¿Gano por los referidos de mis referidos?", "Si invitas a un creador y acepta unirse a tu comunidad antes de generar clientes de pago, recibes 5% de las renovaciones elegibles de sus clientes directos. Ese creador conserva su 15%. Es un solo escalón: no ganas por niveles más profundos ni por registros gratuitos."],
        ["¿Cómo recibo mi dinero?", "El equipo de TokXray revisa los saldos semanalmente y te contacta para coordinar una transferencia manual cuando alcanzas $50 USD disponibles. Los depósitos confirmados aparecen en tu historial; no necesitas una cuenta de Stripe."],
        ["¿Los datos se actualizan en tiempo real?", "Actualizamos el catálogo semanalmente con reportes sobre TikTok Shop México. Consulta el periodo de cada ranking: son referencias históricas, no una garantía de ventas futuras. Algunos videos pueden dejar de estar disponibles."],
      ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section className="partner-final partner-wrap"><p className="partner-eyebrow">TU SIGUIENTE PASO</p><h2>Comparte algo útil.<br />Hazlo con tu código.</h2><Link className="partner-button" to={register(leader ? `/affiliates?leader=${leader}` : "/affiliates")}>Crear mi cuenta <ArrowUpRight size={20} /></Link><p>¿Quieres conocer primero las referencias? <Link to="/app">Explora el catálogo.</Link></p></section>
    </main>
    <footer className="partner-footer partner-wrap"><BrandLogo tone="light" size="sm" /><span>© {new Date().getFullYear()} TokXray</span><Link to="/terminos-afiliados">Condiciones del programa</Link><Link to="/privacy">Privacidad</Link><Link to="/pricing">Precios</Link><BrandContactLinks className="w-full" /></footer>
  </div>;
}
