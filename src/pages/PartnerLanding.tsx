import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Check, Clapperboard, ScanLine, Users, Wallet, Copy, Play, Gift, Link2 } from "lucide-react";
import { BrandContactLinks, BRAND_CONTACT } from "@/components/BrandContactLinks";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CreatorLifetimeCapacity } from "@/components/creators/CreatorLifetimeCapacity";
import { useCreatorLifetimeCapacity } from "@/hooks/useCreatorLifetimeCapacity";
import { supabase } from "@/integrations/supabase/client";
import { getStoredRefCode } from "@/lib/attribution";
import { Events, track } from "@/lib/analytics";
import { isReferralCode, normalizeReferralCode } from "@/lib/referral-code";
import { MONTHLY_PRICE_USD, INITIAL_AFFILIATE_REWARD_USD, DIRECT_RENEWAL_RATE, LEADER_RENEWAL_RATE, DIRECT_RENEWAL_COMMISSION_USD, LEADER_RENEWAL_COMMISSION_USD } from "@/lib/pricing";
import demoVideo from "@/assets/demo/tokxray-demo-1080p.mp4";
import mobileDemoVideo from "@/assets/demo/tokxray-demo-720p.mp4";
import demoPoster from "@/assets/demo/tokxray-demo-poster.jpg";
import "./partner-landing.css";

const usd = (amount: number) => `US$${amount.toFixed(2)}`;
const directPercent = DIRECT_RENEWAL_RATE * 100;
const leaderPercent = LEADER_RENEWAL_RATE * 100;

const panelGuide = [
  { icon: Wallet, title: "Mi panel de referidos", body: "Aquí consultas tu código, clientes, comunidad, comisiones y depósitos. Si aún no tienes un código, el botón para crearlo lo activa gratis." },
  { icon: Copy, title: "Copiar enlace / Copiar código", body: "Úsalos con seguidores que quieran contratar Pro. El enlace lleva tu código de cliente; quien compra debe registrarse con él antes de pagar. El código no cambia el precio." },
  { icon: Link2, title: "Personalizar mi código", body: "El icono del lápiz permite elegir entre 3 y 12 letras o números, una sola vez y antes de recibir referidos o vincular creadores. Guarda el cambio antes de compartirlo." },
  { icon: Users, title: "Copiar enlace de comunidad", body: "Úsalo para invitar a otros creadores que recomendarán TokXray con su propio código. Es distinto del enlace para nuevos clientes: envía el enlace correcto según a quién invites." },
  { icon: Check, title: "Aceptar invitación de comunidad", body: "El creador revisa el código de su líder y acepta las condiciones en su panel antes de generar clientes de pago. Solo puede pertenecer a una comunidad y no puede cambiarla desde el panel." },
  { icon: Gift, title: "Enviar mis videos a revisión", body: "Está en Colaboraciones. Envías tres enlaces originales publicados y aceptas el permiso de pauta. La revisión y el cupo determinan si recibes acceso vitalicio." },
];

const faqs = [
  ["¿Necesito muchos seguidores o pagar para participar?", "Crear tu cuenta y obtener tu código de afiliado es gratis; no necesitas contratar Pro para recomendarlo. Puedes empezar con tu audiencia actual. Si ya acompañas a otros creadores, también puedes desarrollar tu comunidad. El acceso a las funciones Pro se contrata por separado o se obtiene mediante una colaboración aprobada."],
  ["¿Puedo recomendar a seguidores y también invitar creadores?", "Sí. Usa tu enlace de cliente para quienes quieren contratar TokXray y tu enlace de comunidad para creadores que quieren recomendarlo. Tus clientes directos generan el incentivo inicial y 15% de renovaciones; los clientes directos de los creadores vinculados generan para ti 5% de renovaciones elegibles."],
  ["¿Durante cuánto tiempo recibo comisiones?", "Mientras la suscripción atribuida siga generando pagos elegibles, sin límite de seis meses. El incentivo de hasta US$5 se concede una sola vez por cliente nuevo: cancelar y volver a suscribirse no lo repite. Las suscripciones anteriores conservan su política original."],
  ["¿Gano por invitar a un creador grande?", "No hay un pago por incorporar creadores, por su número de seguidores ni por registros gratuitos. Tu 5% depende de las renovaciones elegibles de sus clientes directos. Si ese creador invita a otro creador, los clientes de este último no te generan comisión: solo hay un escalón indirecto."],
  ["¿La comisión sale de las ventas de TikTok Shop?", "No. TokXray paga estas comisiones por suscripciones elegibles a su aplicación. Las ventas reportadas en el catálogo son referencias de TikTok Shop; no representan lo que ganó el creador ni garantizan ventas futuras."],
  ["¿Cómo recibo mi dinero?", "Desde US$50 de saldo disponible. El equipo revisa los saldos semanalmente y te contacta para coordinar una transferencia manual. No necesitas conectar Stripe. El saldo inferior al mínimo se acumula; un saldo disponible no es un depósito realizado. Los pagos confirmados aparecen en tu historial."],
  ["¿Qué pasa si un cliente cancela o pide un reembolso?", "Sin un pago elegible no se genera comisión. Los pagos fallidos y las cuentas gratuitas no cuentan. Reembolsos y contracargos pueden ajustar el saldo del creador y del líder; los importes en revisión no están disponibles para retiro."],
  ["¿Qué significa acceso vitalicio?", "Acceso personal mientras TokXray opere, sujeto a las condiciones y límites razonables de uso. Una vez aprobado, no exige nuevos videos ni referidos. El permiso de publicidad dura 12 meses desde la aprobación y conservas la propiedad del contenido. Si ya pagabas Pro, debes cancelar su renovación desde Configuración: el beneficio no cancela automáticamente una suscripción."],
];

export default function PartnerLanding({ hasSession = false }: { hasSession?: boolean }) {
  const lifetimeCapacity = useCreatorLifetimeCapacity();
  const [params] = useSearchParams();
  const [customers, setCustomers] = useState(20);
  const [creators, setCreators] = useState(5);
  const [mode, setMode] = useState<"direct" | "leader">("direct");
  const [videoSource, setVideoSource] = useState<"presentation" | "demo" | "failed">("presentation");
  const [demoUrl] = useState(() => window.matchMedia("(max-width: 767px)").matches ? mobileDemoVideo : demoVideo);
  const resumeAfterFallback = useRef(false);
  const leaderValue = params.get("leader") || "";
  const leader = isReferralCode(leaderValue) ? normalizeReferralCode(leaderValue) : null;
  const candidate = params.get("ref") || getStoredRefCode() || "";
  const code = !leader && isReferralCode(candidate) ? normalizeReferralCode(candidate) : null;
  const affiliateDestination = leader ? `/affiliates?leader=${leader}` : "/affiliates";
  const register = (destination: string) => `/register?redirect=${encodeURIComponent(destination)}${code ? `&ref=${encodeURIComponent(code)}` : ""}`;
  const affiliateSignup = hasSession ? affiliateDestination : register(affiliateDestination);
  const panelDestination = hasSession ? affiliateDestination : `/login?redirect=${encodeURIComponent(affiliateDestination)}`;
  const { data: presentation } = supabase.storage.from("assets").getPublicUrl("creator-program/presentation.mp4");
  const closed = lifetimeCapacity.capacity?.is_open === false;
  const offerOpen = !lifetimeCapacity.loading && !lifetimeCapacity.error && lifetimeCapacity.capacity?.is_open;
  const totalCustomers = mode === "leader" ? creators * customers : customers;
  const renewal = totalCustomers * (mode === "leader" ? LEADER_RENEWAL_COMMISSION_USD : DIRECT_RENEWAL_COMMISSION_USD);
  const cta = (placement: string, audience: string) => track(Events.LandingCtaClicked, { landing: "creator_program", placement, audience });

  useEffect(() => {
    const previousTitle = document.title;
    const title = "Gana dinero con TokXray | Creadores y líderes de TikTok Shop";
    const description = "Conoce TokXray y gana recomendándolo: US$5 por primer pago directo, 15% de renovaciones y 5% para líderes de comunidad. Reglas, ejemplos y acceso por contenido.";
    document.title = title;
    const metadata = [
      ['meta[name="description"]', "content", description],
      ['meta[property="og:title"]', "content", title],
      ['meta[property="og:description"]', "content", description],
      ['meta[property="og:url"]', "content", "https://tokxray.com/gana"],
      ['meta[name="twitter:title"]', "content", title],
      ['meta[name="twitter:description"]', "content", description],
      ['link[rel="canonical"]', "href", "https://tokxray.com/gana"],
    ].map(([selector, attribute, value]) => {
      const element = document.querySelector(selector);
      const previous = element?.getAttribute(attribute);
      element?.setAttribute(attribute, value);
      return { element, attribute, previous };
    });
    return () => {
      document.title = previousTitle;
      metadata.forEach(({ element, attribute, previous }) => {
        if (previous == null) element?.removeAttribute(attribute);
        else element?.setAttribute(attribute, previous);
      });
    };
  }, []);

  // A campaign can link directly to a section, including after a lazy route load.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return <div className="partner-page">
    <a className="partner-skip" href="#contenido">Saltar al contenido</a>
    <header className="partner-nav partner-wrap">
      <Link to="/" aria-label="TokXray, inicio"><BrandLogo tone="light" size="md" /></Link>
      <nav aria-label="Navegación del programa">
        <a className="partner-nav-section" href="#formas-de-ganar">Cómo ganas</a>
        <a className="partner-nav-section" href="#acceso-vitalicio">Acceso por contenido</a>
        <Link className="partner-nav-panel" to={panelDestination}>Mi panel <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </nav>
    </header>
    <main id="contenido">
      <section className="partner-hero partner-wrap">
        <div>
          <p className="partner-eyebrow"><span /> PROGRAMA DE CREADORES · TIKTOK SHOP MÉXICO</p>
          <h1>Gana dinero <br />con <em>TokXray.</em></h1>
          <p className="partner-intro">Tú pones la voz. Nosotros, la herramienta.<br />Recomienda TokXray a tus seguidores o reúne a creadores que quieran recomendarlo. <strong>Recibe comisiones por suscripciones reales.</strong></p>
          <div className="partner-actions"><a className="partner-button" href="#formas-de-ganar" onClick={() => cta("hero", "explore")}>Encuentra tu forma de ganar <ArrowRight size={19} aria-hidden="true" /></a><a className="partner-text-link" href="#que-es">Primero, ¿qué es TokXray? <ArrowUpRight size={17} aria-hidden="true" /></a></div>
          <p className="partner-caption">Cuenta y código gratis · Sin obligación de contratar Pro</p>
          {leader && <div className="partner-invitation"><Users size={20} aria-hidden="true" /><p>Te invita la comunidad <strong>{leader}</strong>. Podrás revisar y aceptar la invitación en tu panel; registrarte no te vincula automáticamente. <Link to={affiliateSignup}>Revisar invitación <ArrowRight size={15} aria-hidden="true" /></Link></p></div>}
        </div>
        <aside className="partner-ticket" aria-label="Resumen de recompensas">
          <div className="partner-ticket-top"><span>TU CONTENIDO. TU COMUNIDAD.</span><ArrowUpRight size={25} aria-hidden="true" /></div>
          <div className="partner-ticket-main"><strong>US${INITIAL_AFFILIATE_REWARD_USD}</strong><p>por el primer pago<br />de cada cliente directo elegible*</p></div>
          <div className="partner-ticket-row"><strong>{directPercent}%</strong><span>de las renovaciones<br />de tus clientes directos</span></div>
          <div className="partner-ticket-row"><strong>{leaderPercent}%</strong><span>de las renovaciones elegibles<br />de clientes de tu comunidad</span></div>
          <p className="partner-ticket-note">*Hasta el importe cobrado sin impuestos.<br />El 15% del creador y el 5% del líder se pagan a personas distintas.</p>
        </aside>
      </section>

      <div className="partner-jumpbar"><nav className="partner-wrap" aria-label="Secciones de la landing"><a href="#que-es">01 / La aplicación</a><a href="#formas-de-ganar">02 / Tus comisiones</a><a href="#acceso-vitalicio">03 / El trato</a><a href="#tu-panel">04 / Tu panel</a></nav></div>

      <section id="que-es" className="partner-wrap partner-section partner-product">
        <div><p className="partner-eyebrow">QUÉ VAS A RECOMENDAR</p><h2>Antes de grabar,<br />mira qué está funcionando.</h2><p className="partner-body">TokXray es una aplicación para investigar productos y videos de TikTok Shop México. Te ayuda a elegir una referencia, entender cómo está construido un video y preparar tu propio guion.</p>
          <ul className="partner-feature-list"><li><ScanLine aria-hidden="true" /><span><strong>Explora productos, videos y creadores.</strong> Compara ventas reportadas y consulta el periodo de cada ranking.</span></li><li><Play aria-hidden="true" /><span><strong>Entiende el video con Pro.</strong> Revisa su transcripción y análisis: gancho, demostración y cierre.</span></li><li><Clapperboard aria-hidden="true" /><span><strong>Prepara tu versión.</strong> Adapta el guion a tu voz y a tu producto antes de grabar.</span></li></ul>
          <p className="partner-caption">Pro cuesta US${MONTHLY_PRICE_USD} al mes, desde el primer mes y con o sin código. Impuestos aplicables al pagar. El catálogo usa reportes históricos; no garantiza ventas futuras.</p>
          <Link className="partner-text-link" to="/app" onClick={() => cta("product", "explore")}>Explorar la aplicación <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="partner-presentation"><div className="partner-video">
          {videoSource !== "failed" ? <video
            key={videoSource}
            controls playsInline preload="metadata" poster={demoPoster}
            src={videoSource === "presentation" ? presentation.publicUrl : demoUrl}
            aria-label={videoSource === "presentation" ? "Presentación del programa TokXray" : "Demostración de la aplicación TokXray"}
            onPlay={() => { resumeAfterFallback.current = true; }}
            onPause={event => { if (!event.currentTarget.error) resumeAfterFallback.current = false; }}
            onError={() => setVideoSource(current => current === "presentation" ? "demo" : "failed")}
            onCanPlay={event => {
              if (videoSource === "demo" && resumeAfterFallback.current) {
                resumeAfterFallback.current = false;
                void event.currentTarget.play().catch(() => { /* Native controls remain available if playback is blocked. */ });
              }
            }}
          /> : <div className="partner-video-empty"><Clapperboard size={36} aria-hidden="true" /><h3>No pudimos cargar el video.</h3><p>Conoce la herramienta y los pasos para recomendarla en esta página.</p><a href="#como-funciona">Ver cómo funciona <ArrowRight size={18} aria-hidden="true" /></a></div>}
        </div><div className="partner-video-caption"><span>{videoSource === "presentation" ? "DALE PLAY / CONOCE EL PROGRAMA" : "DALE PLAY / MIRA LA APLICACIÓN"}</span><span>TokXray para creadores</span></div><p className="partner-caption">Muestra cómo eliges una referencia y preparas un guion. La comisión de este programa proviene de suscripciones a TokXray, no de ventas de productos en TikTok.</p></div>
      </section>

      <section id="formas-de-ganar" className="partner-wrap partner-section">
        <div className="partner-section-head"><p className="partner-eyebrow">DOS FORMAS DE CRECER</p><h2>¿Tienes audiencia?<br />¿O una red de creadores?</h2><p>Elige por dónde empezar. Puedes participar en ambas rutas; cada una tiene su enlace y sus propias comisiones.</p></div>
        <div className="partner-paths">
          <article className="partner-path"><div className="partner-path-top"><span>01 / CREADOR</span><Users size={23} aria-hidden="true" /></div><h3>Invita a tus seguidores.</h3><p>Para quienes comparten contenido con personas que venden —o quieren empezar a vender— en TikTok Shop.</p><div className="partner-path-reward"><strong>US${INITIAL_AFFILIATE_REWARD_USD}</strong><span>primer pago directo elegible</span><b>+ {directPercent}%</b><span>de sus renovaciones elegibles</span></div><ul><li>Muestra cómo usas TokXray en tus videos, lives o comunidad.</li><li>Comparte tu enlace de cliente o tu código.</li><li>Cuando un cliente nuevo paga Pro con tu código, se registra tu comisión.</li></ul><p className="partner-path-example">Una renovación completa de US${MONTHLY_PRICE_USD} = <strong>{usd(DIRECT_RENEWAL_COMMISSION_USD)} para ti.</strong></p><Link className="partner-button" to={affiliateSignup} onClick={() => cta("creator_path", "creator")}>Quiero recomendar TokXray <ArrowUpRight size={18} aria-hidden="true" /></Link></article>
          <article className="partner-path partner-path-leader"><div className="partner-path-top"><span>02 / LÍDER DE COMUNIDAD</span><Users size={23} aria-hidden="true" /></div><h3>Invita a otros creadores.</h3><p>Para creadores grandes, mentores y líderes que pueden acercar la herramienta a otros creadores con su propia audiencia.</p><div className="partner-path-reward"><strong>{leaderPercent}%</strong><span>de las renovaciones elegibles de<br />los clientes directos de tus creadores</span></div><ul><li>Comparte tu enlace de comunidad con otros creadores.</li><li>Ellos aceptan vincularse antes de generar clientes de pago.</li><li>Cada creador comparte su propio código. Tú ganas cuando sus clientes renuevan.</li></ul><p className="partner-path-example">US$0.75 por cada renovación completa de US${MONTHLY_PRICE_USD}. <strong>Tu creador conserva su {directPercent}%.</strong></p><Link className="partner-button partner-button-cyan" to={affiliateSignup} onClick={() => cta("leader_path", "leader")}>Quiero crear mi comunidad <ArrowUpRight size={18} aria-hidden="true" /></Link></article>
        </div>
        <div className="partner-split-example" aria-label="Ejemplo del reparto de una renovación"><p>UNA RENOVACIÓN DE US${MONTHLY_PRICE_USD}</p><div><span>Cliente del creador</span><ArrowRight aria-hidden="true" /><span><strong>{usd(DIRECT_RENEWAL_COMMISSION_USD)}</strong> para el creador · {directPercent}%</span><span className="partner-split-plus">+</span><span><strong>{usd(LEADER_RENEWAL_COMMISSION_USD)}</strong> para su líder · {leaderPercent}%</span></div><p>Son dos personas distintas. No se paga por incorporar creadores ni por primeras compras indirectas. Solo hay un escalón indirecto; los niveles más profundos no generan comisión para ti.</p></div>
      </section>

      <section id="calculadora" className="partner-calculator-band"><div className="partner-wrap partner-calculator">
        <div><p className="partner-eyebrow">LOS NÚMEROS, SIN VUELTAS</p><h2>Calcula un escenario.<br />Entiende tu comisión.</h2><p>Un cliente nuevo paga ${MONTHLY_PRICE_USD} USD al mes desde el inicio. Elige una ruta y cambia las cantidades para ver el cálculo sobre pagos completos.</p><p>Es un ejemplo ilustrativo: no garantiza resultados. Se calcula sin impuestos, reembolsos ni pagos fallidos; solo cuentan cobros elegibles.</p><div className="partner-calculator-toggle" role="group" aria-label="Tipo de comisión"><button type="button" aria-pressed={mode === "direct"} onClick={() => setMode("direct")}>Mis clientes</button><button type="button" aria-pressed={mode === "leader"} onClick={() => setMode("leader")}>Mi comunidad</button></div></div>
        <div className="partner-calculator-card">
          {mode === "leader" && <div><label htmlFor="community-creators">Creadores vinculados <strong>{creators}</strong></label><input id="community-creators" type="range" min="1" max="50" value={creators} onChange={e => setCreators(Number(e.target.value))} /></div>}
          <label htmlFor="referrals">{mode === "direct" ? "Clientes directos que renuevan" : "Clientes que renuevan por creador"}<strong>{customers}</strong></label><input id="referrals" type="range" min="1" max="200" value={customers} onChange={e => setCustomers(Number(e.target.value))} />
          <p className="partner-result-label">{mode === "direct" ? "TU COMISIÓN POR RENOVACIONES" : "TU COMISIÓN COMO LÍDER"}</p><output htmlFor={mode === "direct" ? "referrals" : "referrals community-creators"} aria-live="polite"><strong>{usd(renewal)}</strong><span> en ese mes</span></output><p>{mode === "leader" ? `${creators} creadores × ${customers} renovaciones` : `${customers} renovaciones`} × US${MONTHLY_PRICE_USD} × {mode === "direct" ? directPercent : leaderPercent}%.</p>
          <div className="partner-calculator-initial">{mode === "direct" ? <><strong>Si fueran {customers} clientes nuevos:</strong><span>{usd(customers * INITIAL_AFFILIATE_REWARD_USD)} por sus primeros pagos elegibles. Es otro escenario; no se suma a las renovaciones de arriba.</span></> : <><strong>Los creadores conservan su {directPercent}%.</strong><span>{usd(customers * DIRECT_RENEWAL_COMMISSION_USD)} para cada creador en este ejemplo. Tú no cobras por su primer pago indirecto.</span></>}</div>
        </div>
      </div></section>

      <section id="acceso-vitalicio" className="partner-wrap partner-section partner-lifetime">
        <div><p className="partner-eyebrow">OTRA RECOMPENSA / TU CONTENIDO</p><h2>{closed ? <>Los 100 accesos<br />ya fueron otorgados.</> : <>3 videos tuyos.<br />TokXray para ti.</>}</h2><p className="partner-body">{closed ? "La oferta de acceso vitalicio por contenido está cerrada. Si tu acceso ya fue aprobado, lo conservas. Puedes seguir participando en el programa de comisiones." : "Los primeros 100 creadores con tres videos originales publicados y aprobados, más el permiso de pauta, reciben acceso personal mientras TokXray opere."}</p><CreatorLifetimeCapacity state={lifetimeCapacity} tone="dark" /></div>
        <div className="partner-deal"><p className="partner-eyebrow">EL TRATO, COMPLETO</p><div><span>TÚ ENTREGAS</span><h3>Tres videos + permiso de pauta.</h3><p>Tres videos originales publicados que muestren cómo usas TokXray. Envías los enlaces y autorizas su uso en anuncios durante 12 meses desde la aprobación. Conservas la propiedad de tu contenido.</p></div><div><span>TÚ RECIBES, SI SE APRUEBA Y HAY CUPO</span><h3>Acceso personal vitalicio.</h3><p>Mientras TokXray opere, sujeto a sus condiciones y límites de uso. No necesitas conseguir referidos ni publicar más videos para conservarlo. Este beneficio no es un pago en efectivo ni genera comisión para quien te invitó.</p></div>
          {offerOpen ? <Link className="partner-button" to={hasSession ? "/colaboraciones" : register("/colaboraciones")} onClick={() => cta("lifetime", "content")}>Ver requisitos y enviar mis videos <ArrowUpRight size={18} aria-hidden="true" /></Link> : <Link className="partner-text-link" to="/colaboraciones">{closed ? "Consultar mi solicitud o acceso" : "Consultar disponibilidad"} <ArrowRight size={17} aria-hidden="true" /></Link>}
          <p className="partner-caption">Crear tu cuenta, recibir una prueba o enviar los enlaces no reserva una plaza. Se asigna al aprobar los tres videos y el permiso. {closed ? "No grabes contenido para solicitar este beneficio: el cupo está agotado." : <>Si fuiste invitado, <a href={BRAND_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">contacta al equipo para solicitar tu prueba</a> antes de grabar; no se activa automáticamente.</>}</p>
        </div>
      </section>

      <section id="como-funciona" className="partner-wrap partner-section partner-start"><div className="partner-section-head"><p className="partner-eyebrow">DE LA IDEA A TU PRIMER ENLACE</p><h2>Así empiezas.</h2></div><ol className="partner-steps">{[
        ["01", "Crea tu cuenta gratis", "Regístrate con tu correo y confírmalo, o entra con Google. Abre tu panel de referidos y obtén tu código."],
        ["02", "Comparte el enlace correcto", "Clientes: tu enlace para recomendar Pro. Creadores: tu enlace de comunidad. Si te invitó un líder, acepta su invitación antes de generar clientes de pago."],
        ["03", "Consulta y cobra", "Revisa clientes, comisiones y saldo disponible. Desde US$50, el equipo coordina el pago en su revisión semanal por transferencia manual."],
      ].map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol></section>

      <section id="tu-panel" className="partner-wrap partner-section"><div className="partner-section-head"><p className="partner-eyebrow">CADA BOTÓN TIENE UN PROPÓSITO</p><h2>Tu guía dentro de TokXray.</h2><p>“Gana recomendando” te trae a esta explicación. “Mi panel de referidos” abre las herramientas para compartir y dar seguimiento.</p></div><div className="partner-guide">{panelGuide.map(({ icon: Icon, title, body }) => <article key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><div className="partner-balance-guide"><Wallet size={24} aria-hidden="true" /><p><strong>Total ganado, Disponible y Retirado son distintos.</strong> Total ganado reúne tus comisiones; Disponible es el saldo que puede entrar a revisión de pago; Retirado muestra depósitos confirmados. Los reembolsos o disputas pueden ajustar el saldo. Revisión semanal no significa depósito automático cada semana.</p></div><Link className="partner-text-link" to={panelDestination} onClick={() => cta("panel_guide", "panel")}>Ir a mi panel de referidos <ArrowRight size={18} aria-hidden="true" /></Link></section>

      <section id="preguntas" className="partner-wrap partner-faq"><div><p className="partner-eyebrow">ANTES DE EMPEZAR</p><h2>Las reglas,<br />claras.</h2><p>Cuando recomiendes TokXray, explica que puedes recibir una comisión. Comparte tu experiencia sin prometer ingresos ni ventas.</p><Link className="partner-text-link" to="/terminos-afiliados">Leer condiciones completas <ArrowUpRight size={17} aria-hidden="true" /></Link></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section className="partner-final partner-wrap"><p className="partner-eyebrow">TU VOZ PUEDE ABRIR OTRA FUENTE DE INGRESOS</p><h2>Comparte lo que sabes.<br /><em>Gana recomendando.</em></h2><Link className="partner-button" to={affiliateSignup} onClick={() => cta("final", "creator")}>{hasSession ? "Abrir mi panel de referidos" : "Crear mi cuenta gratis"} <ArrowUpRight size={20} aria-hidden="true" /></Link><p>¿Ya tienes cuenta? <Link to={panelDestination}>Entra a tu panel.</Link> ¿Prefieres usar Pro? <Link to={register("/pricing")}>Quiero usar la herramienta.</Link></p></section>
    </main>
    <footer className="partner-footer partner-wrap"><BrandLogo tone="light" size="sm" /><span>© {new Date().getFullYear()} TokXray</span><Link to="/terminos-afiliados">Condiciones del programa</Link><Link to="/privacy">Privacidad</Link><Link to="/pricing">Precios</Link><BrandContactLinks className="w-full" /></footer>
  </div>;
}
