import { MONTHLY_PRICE_USD, estimateMxn } from "@/lib/pricing";
import { Children, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Gem,
  PlayCircle,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
import { ProductTour, CreatorScenarios } from "@/components/landing/ProductTour";
import { SalesCase, estimateCaseCommission } from "@/components/landing/SalesCase";
import { BrandContactLinks, BRAND_CONTACT } from "@/components/BrandContactLinks";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useMarket } from "@/contexts/MarketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Events,
  clearMark,
  mark,
  measureSince,
  track,
  trackViewContent,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { formatReportPeriod } from "@/lib/catalog-period";
import { useCreatorLifetimeCapacity } from "@/hooks/useCreatorLifetimeCapacity";

/* Landing: evidencia de ventas → demostración del producto → explorar el catálogo.
 * Las cifras corresponden al reporte importado, no a ventas en tiempo real.
 * Los CTA de exploración llevan a la vista previa de /app. */

/* ------------------------- live data types -------------------------- */

interface LiveVideo {
  id: string;
  thumbnail_url: string | null;
  video_mp4_url: string | null;
  title: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  revenue_mxn: number | null;
  snapshot_date_range: string | null;
  sales: number | null;
  views: number | null;
  product_name: string | null;
  product_id: string | null;
  product?: { commission: number | null } | null;
}

interface LiveOpportunity {
  id: string | null;
  producto_nombre: string | null;
  imagen_url: string | null;
  gmv_30d_calc: number | null;
  earning_per_sale: number | null;
  is_hidden_gem: boolean | null;
  is_high_pay: boolean | null;
  opportunity_index: number | null;
}

/* ----------------------------- copy --------------------------------- */

const faqs = [
  {
    q: "¿Qué voy a poder hacer con TokXray?",
    a: "Elegir un producto con más contexto antes de grabar. Consulta videos con ventas reportadas de TikTok Shop México, entiende qué se dijo y adapta el guion a tu producto y a tu forma de hablar. Tú decides qué probar; TokXray te ayuda a dejar de empezar desde cero.",
  },
  {
    q: "¿En qué se diferencia de buscar videos gratis en TikTok?",
    a: "Aquí puedes comparar la referencia, sus ventas reportadas y el análisis de su guion en un mismo recorrido. Las vistas por sí solas no te dicen cuánto vendió un video. Revisa el período del reporte antes de comparar.",
  },
  {
    q: "¿Puedo explorar antes de pagar?",
    a: "Sí. Puedes explorar la vista previa sin tarjeta y crear tu cuenta gratis. Los datos completos y las herramientas de análisis requieren Pro, por US$15 al mes. Crear una cuenta no inicia una suscripción ni genera un cobro.",
  },
  {
    q: "¿Cada cuánto se actualiza?",
    a: "Actualizamos el catálogo semanalmente con reportes sobre TikTok Shop México. Consulta el período de cada ranking y la fecha del último reporte; no son ventas en tiempo real.",
  },
  {
    q: "¿Tengo que copiar lo que dice otro creador?",
    a: "No. Usa la referencia para entender cómo empieza, demuestra el producto y propone la compra. Adapta la estructura a tu voz y revisa las transcripciones y variantes de IA. Publica tu propio video y solo afirma lo que puedas demostrar.",
  },
  {
    q: "¿Esto garantiza que voy a vender?",
    a: "No. Las ventas de otra persona no garantizan las tuyas. Las oportunidades comparan señales del reporte: ventas, creadores y comisión disponible. Son un punto de partida para elegir y probar, no una promesa de ingresos ni de poca competencia futura.",
  },
  {
    q: "¿Las variantes y el análisis tienen límites?",
    a: "Sí. La generación con IA tiene límites de uso y disponibilidad. Si se alcanza una cuota temporal, la plataforma te lo indica para intentarlo más tarde. Los guiones y análisis que ya están guardados en el catálogo siguen disponibles con tu acceso Pro.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. En Configuración puedes gestionar tu suscripción y cancelar la próxima renovación. Conservas el acceso hasta que termine el período pagado. El cobro mensual es en USD; tu banco determina el importe en pesos.",
  },
];

const PRICE_USD = MONTHLY_PRICE_USD;

/* ============================== page ============================== */

const Landing = () => {
  const lifetimeCapacity = useCreatorLifetimeCapacity();
  const navigate = useNavigate();
  const { market } = useMarket();
  const { formatMoney } = useLanguage();

  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [opps, setOpps] = useState<LiveOpportunity[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [oppsLoading, setOppsLoading] = useState(true);


  const pricingRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const pricingFired = useRef(false);
  const footerFired = useRef(false);

  /* ---- Meta Pixel ViewContent: landing is the product page ---- */
  useEffect(() => {
    trackViewContent("landing", "tokxray_pro");
  }, []);

  /* ---- live videos carousel (non-premium columns only) ---- */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setVideosLoading(true);
      try {
        const { data, error } = await supabase
          .from("videos")
          .select(
            `id, thumbnail_url, video_mp4_url, title, creator_name, creator_handle,
             revenue_mxn, sales, views, product_name, product_id, snapshot_date_range,
             product:products!product_id ( commission )`,
          )
          .eq("country", market)
          .not("rank", "is", null)
          .not("product_id", "is", null)
          .not("video_mp4_url", "is", null)
          .neq("video_mp4_url", "")
          .order("rank", { ascending: true })
          .limit(10);
        if (error) throw error;
        if (!cancelled) setVideos((data as LiveVideo[]) || []);
      } catch {
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [market]);

  /* ---- live opportunities carousel ---- */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setOppsLoading(true);
      try {
        const { data, error } = await supabase
          .from("product_opportunities")
          .select(
            `id, producto_nombre, imagen_url, gmv_30d_calc, earning_per_sale,
             is_hidden_gem, is_high_pay, opportunity_index, market, rank`,
          )
          .eq("market", market)
          .not("rank", "is", null)
          .order("opportunity_index", { ascending: false, nullsFirst: false })
          .limit(12);
        if (error) throw error;
        if (!cancelled) setOpps((data as LiveOpportunity[]) || []);
      } catch {
        if (!cancelled) setOpps([]);
      } finally {
        if (!cancelled) setOppsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [market]);

  /* ---- section-view analytics ---- */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (entry.target === pricingRef.current && !pricingFired.current) {
              pricingFired.current = true;
              track(Events.LandingPricingViewed);
            }
            if (entry.target === footerRef.current && !footerFired.current) {
              footerFired.current = true;
              track(Events.LandingFooterViewed);
            }
          }
        }
      },
      { threshold: 0.5 },
    );
    if (pricingRef.current) obs.observe(pricingRef.current);
    if (footerRef.current) obs.observe(footerRef.current);
    return () => obs.disconnect();
  }, []);

  /* All landing CTAs go straight to the app (no login wall here). */
  const goApp = (location: string) => {
    track(Events.LandingCtaClicked, { location, destination: "app" });
    navigate("/app");
  };

  const onFaqOpen = (index: number) => {
    track(Events.LandingFaqOpened, { question_index: index });
  };

  // Charged in USD; the headline shows the canonical USD price. For MX we
  // additionally surface an approximate MXN equivalent below it.
  const priceLabel = `$${PRICE_USD.toFixed(2)} USD`;
  const [featuredVideoId, setFeaturedVideoId] = useState<string | null>(null);
  const featuredVideo = videos.find(video => video.id === featuredVideoId) || videos[0];

  return (
    <div className="min-h-dvh bg-brand-mist text-brand-ink">
      <GlobalHeader showMenu={false} />
      <div className="flex min-h-11 items-center justify-center gap-3 border-b border-white/10 bg-brand-ink px-4 text-xs text-brand-mist">
        <a href="/gana" className="inline-flex min-h-11 items-center gap-1 font-medium">Gana recomendando <ArrowRight className="size-3" /></a>
        <span className="text-white/20" aria-hidden="true">|</span>
        <a href="/gana#acceso-vitalicio" className="inline-flex min-h-11 items-center text-brand-cyan" aria-label={lifetimeCapacity.capacity ? lifetimeCapacity.capacity.is_open ? `Solo 100 creadores: quedan ${lifetimeCapacity.capacity.remaining} accesos vitalicios por contenido` : 'Los 100 accesos vitalicios ya fueron otorgados · conoce el programa' : 'Oferta para los primeros 100 creadores · consulta disponibilidad'}>{lifetimeCapacity.capacity ? lifetimeCapacity.capacity.is_open ? `${lifetimeCapacity.capacity.remaining} de 100 plazas` : 'Conoce el programa' : 'Primeros 100 creadores'}</a>
      </div>

      {/* Real catalogue evidence sits beside the promise, with its report period. */}
      <section className="bg-brand-ink text-brand-mist border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-[var(--page-pad-x)] pt-9 pb-12 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-12 md:py-16">
          <div className="min-w-0">
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-cyan"><TrendingUp className="size-4" />Para creadores que quieren vender más en TikTok Shop</p>
            <h1 className="max-w-xl text-[2.75rem] leading-[1.03] sm:text-6xl font-display font-extrabold text-balance">
              Graba para <span className="text-brand-pink">vender.</span><br />No para probar suerte.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-mist/75 text-pretty">
              Encuentra productos con ventas, estudia los videos que las generaron y adapta sus guiones a tu voz. Menos horas adivinando. Más enfoque en tu próxima comisión.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="brand" size="brand-xl" onClick={() => goApp("hero")} className="w-full sm:w-auto">Ver qué está vendiendo <ArrowRight className="ml-1 size-5" /></Button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-brand-mist/55">Explora gratis, sin tarjeta. Pro: US$15/mes. Tú decides cuándo dar el siguiente paso.</p>
            <div className="mt-7 grid grid-cols-3 border-t border-white/15 pt-5 gap-4 text-xs">
              <div><span className="block font-semibold text-brand-mist">Qué vende</span><span className="block mt-1 text-brand-mist/50">Ventas reportadas</span></div>
              <div><span className="block font-semibold text-brand-mist">Qué decir</span><span className="block mt-1 text-brand-mist/50">Guiones + variantes</span></div>
              <div><span className="block font-semibold text-brand-mist">Dónde entrar</span><span className="block mt-1 text-brand-mist/50">Demanda y competencia</span></div>
            </div>
          </div>
          <div className="min-w-0">
            <LandingProof video={featuredVideo} loading={videosLoading} formatMoney={formatMoney} onExplore={() => goApp("real_proof")} />
            {videos.length > 1 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Elegir ejemplo real">
              <span className="text-xs text-brand-mist/50 mr-1">Mira otro caso</span>
              {videos.slice(0, 3).map((video, index) => <button type="button" key={video.id} aria-label={`Ver ejemplo real ${index + 1}`} aria-pressed={featuredVideo?.id === video.id} onClick={() => setFeaturedVideoId(video.id)} className={cn("min-h-11 min-w-11 rounded-full border px-3 text-xs font-semibold", featuredVideo?.id === video.id ? "bg-brand-cyan text-brand-ink border-brand-cyan" : "border-white/20 text-brand-mist/70 hover:bg-white/10")}>{index + 1}</button>)}
            </div>}
          </div>
        </div>
      </section>

      <SalesCase video={featuredVideo} onExplore={() => goApp("sales_case")} />
      <ProductTour onExplore={goApp} />

      {/* ===================== LIVE VIDEOS CAROUSEL ===================== */}
      <section className="bg-brand-ink text-brand-mist border-b border-white/5">
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-14 md:py-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="text-micro uppercase text-brand-cyan inline-flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />
                Referencias con ventas reportadas · México
              </span>
              <h2 className="mt-2 text-display-md font-display font-extrabold tracking-tight">
                Las vistas llaman la atención. Las ventas cambian la decisión.
              </h2>
            </div>
          </div>

          <HScroll
            ariaLabel="Videos que más venden"
            animate={false}
            direction="left"
          >
            {videosLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <VideoSkeleton key={i} />
                ))
              : videos.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    formatMoney={formatMoney}
                  />
                ))}
          </HScroll>
          {!videosLoading && videos.length === 0 && <p className="text-sm text-brand-mist/60">No hay videos disponibles en este momento.</p>}

          <div className="mt-6 flex justify-center">
            <Button variant="brand-outline" size="brand-md" onClick={() => goApp("video_carousel_cta")}>
              Explorar el ranking
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== OPPORTUNITIES CAROUSEL ===================== */}
      <section className="bg-brand-mist border-b border-brand-ink/5">
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-14 md:py-20">
          <div className="mb-6">
            <span className="text-micro uppercase text-brand-pink inline-flex items-center gap-1.5">
              <Gem className="h-3.5 w-3.5" />
              Productos con oportunidad · México
            </span>
            <h2 className="mt-2 text-display-md font-display font-extrabold tracking-tight text-brand-ink">
              Busca tu espacio antes de que todos graben lo mismo.
            </h2>
            <p className="mt-2 max-w-xl text-brand-ink/60">
              Cruza demanda, creadores y comisión para detectar productos que merecen una mirada. Busca dónde competir antes de seguir otra tendencia a ciegas.
            </p>
          </div>

          <HScroll
            ariaLabel="Productos con oportunidad"
            tone="light"
            animate={false}
            direction="right"
          >
            {oppsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <OppSkeleton key={i} />
                ))
              : opps.map((p) => (
                  <OppCard
                    key={p.id}
                    opp={p}
                    formatMoney={formatMoney}
                    onClick={() => goApp("opp_carousel")}
                  />
                ))}
          </HScroll>
          <p className="mt-3 text-xs text-brand-ink/60">Cifras del reporte importado. Abre el catálogo para revisar el período y los datos disponibles de cada producto.</p>
          {!oppsLoading && opps.length === 0 && <p className="text-sm text-brand-ink/60">No hay oportunidades disponibles en este momento.</p>}

          <div className="mt-6 flex justify-center">
            <Button variant="brand" size="brand-md" onClick={() => goApp("opp_carousel_cta")}>
              Encontrar mi próxima oportunidad
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <CreatorScenarios onExplore={goApp} />

      {/* ===================== PRICING ===================== */}
      <section ref={pricingRef} className="bg-brand-mist">
        <div className="mx-auto max-w-4xl px-[var(--page-pad-x)] py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-pink">Precio</span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-brand-ink">
              Tómate en serio tu próxima comisión.
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-card bg-gradient-ink p-8 text-brand-mist shadow-card-tactile-lg md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(40rem 20rem at 100% 0%, rgba(254,44,85,0.45), transparent 60%)",
              }}
            />
            <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-pill bg-brand-cyan/15 px-3 py-1 text-micro text-brand-cyan-200">
                  <Zap className="h-3 w-3" />
                  Acceso completo
                </div>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-money-xl font-extrabold">
                    {priceLabel}
                  </span>
                  <span className="text-brand-mist/50">/mes</span>
                </div>
                {market === "mx" && (
                  <p className="text-sm text-brand-mist/55">
                    ≈ ${estimateMxn(PRICE_USD)} MXN al mes a $18 MXN por dólar. Se cobra en USD; el tipo de cambio final lo determina tu banco.
                  </p>
                )}
                <ul className="mt-6 space-y-2 text-sm text-brand-mist/80">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Encuentra videos que generaron ventas, no solo vistas
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Pasa del guion en blanco a variantes para vender con tu voz
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Busca productos con demanda y menor competencia
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Estudia cómo presentan el producto los creadores del catálogo
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Gestiona o cancela tu plan desde Configuración
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Button variant="brand" size="brand-xl" onClick={() => goApp("pricing")} className="w-full">Ver qué está vendiendo <ArrowRight className="ml-1 h-5 w-5" /></Button>
                <p className="text-center text-xs text-brand-mist/45">
                  La vista previa es gratis. Pro se contrata por separado y se renueva cada mes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="bg-brand-mist border-t border-brand-ink/5">
        <div className="mx-auto max-w-3xl px-[var(--page-pad-x)] py-16 md:py-20">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-pink">Antes de decidir</span>
            <h2 className="mt-3 text-display-md font-display font-extrabold tracking-tight text-brand-ink">
              Resuelve tus dudas antes de dar el paso
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => (
              <FAQItem
                key={item.q}
                q={item.q}
                a={item.a}
                index={i}
                onOpen={onFaqOpen}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="bg-brand-mist pb-16 pt-4">
        <div className="mx-auto max-w-5xl px-[var(--page-pad-x)]">
          <div className="relative overflow-hidden rounded-card bg-gradient-brand p-10 text-center text-white shadow-card-tactile-lg md:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 15%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-balance">
                Tu tiempo vale más que seguir adivinando.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Quieres que el esfuerzo de grabar se convierta en ventas. Empieza por ver qué se vende, cómo lo presentan y dónde puedes aportar algo distinto.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  variant="cyber"
                  size="brand-xl"
                  onClick={() => goApp("final_cta")}
                >
                  <PlayCircle className="mr-1.5 h-5 w-5" />
                  Ver qué está vendiendo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer ref={footerRef} className="border-t border-brand-ink/10 bg-brand-mist">
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-12">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-col items-center md:items-start gap-1">
              <BrandLogo tone="dark" />
              <p className="text-sm text-brand-ink/50">
                Deja de adivinar. Encuentra qué vender y cómo contarlo.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-brand-ink/55">
              <button onClick={() => navigate("/app")} className="hover:text-brand-ink">
                Entrar
              </button>
              <a href="/login" className="hover:text-brand-ink">
                Iniciar sesión
              </a>
              <a href={`mailto:${BRAND_CONTACT.email}`} className="hover:text-brand-ink">
                Contacto
              </a>
            </div>
            <p className="text-xs text-brand-ink/40">
              © {new Date().getFullYear()} TokXray. Todos los derechos reservados.
            </p>
          </div>
          <BrandContactLinks className="mt-6 justify-center text-brand-ink/70" />
          <p className="mt-5 text-center text-xs text-brand-ink/50">
            TokXray es una herramienta independiente, no afiliada a TikTok. Las ventas corresponden al reporte indicado y no garantizan resultados propios.
          </p>
        </div>
      </footer>
    </div>
  );
};

function LandingVideo({ video, label, className, onError }: { video: LiveVideo; label: string; className: string; onError: () => void }) {
  const player = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = player.current;
    if (!element) return;
    const pauseWhenHidden = () => { if (document.visibilityState !== 'visible') element.pause(); };
    const observer = new IntersectionObserver(entries => {
      const inView = entries.some(entry => entry.isIntersecting);
      setVisible(inView);
      if (!inView) element.pause();
    }, { threshold: 0.01 });
    observer.observe(element);
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pauseWhenHidden); element.pause(); };
  }, [video.video_mp4_url]);
  const source = video.thumbnail_url ? video.video_mp4_url! : `${video.video_mp4_url!.split('#')[0]}#t=0.1`;
  return <video ref={player} src={source} poster={video.thumbnail_url || undefined} controls playsInline
    preload={visible ? 'metadata' : 'none'} aria-label={label} className={className} onError={onError}
    onPlay={event => { document.querySelectorAll('video').forEach(other => { if (other !== event.currentTarget) other.pause(); }); }} />;
}

function LandingProof({ video, loading, formatMoney, onExplore }: { video?: LiveVideo; loading: boolean; formatMoney: (n: number | null | undefined) => string; onExplore: () => void }) {
  const [failed, setFailed] = useState(false);
  const commissionEstimate = estimateCaseCommission(video?.revenue_mxn, video?.product?.commission);
  useEffect(() => setFailed(false), [video?.video_mp4_url]);
  if (loading) return <div className="h-96 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center text-sm text-brand-mist/50" role="status">Cargando un caso del catálogo…</div>;
  if (!video) return <div className="rounded-2xl border border-white/15 p-7"><p className="text-xs font-semibold text-brand-cyan">MIRA LOS DATOS POR TI MISMO</p><h2 className="mt-3 text-2xl font-bold text-balance">Las decisiones empiezan con evidencia.</h2><p className="mt-3 text-sm text-brand-mist/60">Explora los videos disponibles y consulta las ventas y el periodo de cada reporte.</p><Button variant="brand-outline" className="mt-5" onClick={onExplore}>Abrir el catálogo</Button></div>;
  return <article className="overflow-hidden rounded-2xl border border-white/20 bg-white/[0.04]" aria-label="Caso real del catálogo">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs"><span className="font-semibold text-brand-cyan">CASO REAL DEL CATÁLOGO</span><span className="text-brand-mist/50">TikTok Shop México</span></div>
    <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      <div className="aspect-[9/16] bg-black min-w-0">
        {!failed && video.video_mp4_url ? <LandingVideo key={video.id} video={video} label={`Video de ${video.creator_handle || video.creator_name || 'TikTok Shop'}`} className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <div className="flex h-full items-center justify-center p-3 text-center text-xs text-brand-mist/50">Video no disponible en este momento</div>}
      </div>
      <div className="min-w-0 p-4 sm:p-5 flex flex-col justify-center">
        <p className="text-[11px] text-brand-mist/55">Este video generó ventas por</p>
        <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold tabular-nums text-brand-cyan break-words">{video.revenue_mxn == null ? 'Sin dato' : formatMoney(video.revenue_mxn)}</p>
        <p className="mt-2 text-[10px] leading-relaxed text-brand-mist/50">MXN · según el reporte<br />{video.snapshot_date_range ? formatReportPeriod(video.snapshot_date_range) : 'Consulta el periodo en el catálogo'}</p>
        <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-semibold line-clamp-2">{video.product_name || video.title || 'Video de TikTok Shop'}</p><p className="mt-2 text-[11px] text-brand-mist/50 truncate">@{(video.creator_handle || video.creator_name || 'creador').replace(/^@/, '')}</p></div>
        {commissionEstimate != null && <p className="mt-3 text-xs leading-relaxed text-brand-cyan">Comisión estimada ≈ <strong>{formatMoney(commissionEstimate)}</strong><br /><span className="text-brand-mist/55">Con {video.product?.commission}% del producto</span></p>}
        {video.sales != null && <p className="mt-3 text-xs text-brand-mist/70"><strong className="tabular-nums text-brand-mist">{video.sales.toLocaleString('es-MX')}</strong> unidades reportadas</p>}
      </div>
    </div>
    <button type="button" onClick={onExplore} className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-left text-xs font-semibold text-brand-mist hover:bg-white/5">Mira el video. Estudia la venta. Haz tu versión.<ArrowRight className="size-4 shrink-0 text-brand-pink" /></button>
  </article>;
}

/* ============================== atoms ============================== */

/** Reads the user's reduced-motion preference, reactively. */
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    // Safari <14 uses addListener/removeListener.
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return reduced;
};

// Pixels per second — slow and elegant. Loop duration is derived from the
// track width so speed stays constant no matter how many cards loaded.
const MARQUEE_SPEED = 40;
// Approx. card footprint (card width + gap). Cards are 200px wide, gap-3 = 12px.
const CARD_STEP = 212;

/**
 * Horizontal rail.
 *
 * When `animate` is true and the user hasn't requested reduced motion (and we
 * have ≥2 cards), the rail becomes a seamless marquee: the children are
 * rendered twice and the track is translated by exactly -50%, so the loop
 * point is pixel-identical and there's no visible jump. It pauses while the
 * pointer hovers or while a finger is touching/dragging it, and resumes on
 * release. Otherwise (loading, reduced motion, or <2 cards) it falls back to
 * the manual scroll-snap rail with arrow controls.
 */
const HScroll = ({
  children,
  ariaLabel,
  tone = "dark",
  animate = false,
  direction = "left",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  tone?: "dark" | "light";
  animate?: boolean;
  direction?: "left" | "right";
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);

  const items = useMemo(() => Children.toArray(children), [children]);
  const shouldMarquee = animate && !reducedMotion && items.length >= 2;

  const scrollBy = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };
  const arrowCls =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-brand-mist hover:bg-white/10"
      : "border-brand-ink/10 bg-white text-brand-ink hover:bg-brand-mist-100 shadow-card-tactile";

  if (shouldMarquee) {
    // One full loop scrolls the length of a single (un-duplicated) set.
    const setWidth = items.length * CARD_STEP;
    const durationSec = Math.max(20, setWidth / MARQUEE_SPEED);
    const animationName =
      direction === "left" ? "marquee-left" : "marquee-right";

    return (
      <div
        className="relative overflow-hidden -mx-[var(--page-pad-x)] px-[var(--page-pad-x)]"
        aria-label={ariaLabel}
        role="group"
      >
        <div
          className="flex w-max gap-3 pb-2"
          style={{
            animationName,
            animationDuration: `${durationSec}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
            willChange: "transform",
          }}
          // Desktop: pause on hover.
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          // Mobile / pointer drag: pause while the finger is down, resume on lift.
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* set A */}
          {items.map((child, i) => (
            <div key={`a-${i}`} className="flex-shrink-0">
              {child}
            </div>
          ))}
          {/* set A duplicated — purely visual filler for the seamless loop.
              Non-interactive so it doesn't create duplicate tab stops. */}
          {items.map((child, i) => (
            <div
              key={`b-${i}`}
              className="flex-shrink-0 [&_button]:pointer-events-none [&_button]:-z-0"
              aria-hidden
              tabIndex={-1}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: manual scroll-snap rail (loading / reduced motion / <2 cards).
  return (
    <div className="relative">
      <div
        ref={ref}
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-[var(--page-pad-x)] px-[var(--page-pad-x)] pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      {/* arrows: desktop only */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scrollBy(-1)}
        className={cn(
          "absolute left-0 top-1/2 hidden -translate-y-1/2 -translate-x-1/2 rounded-full border p-2 md:flex",
          arrowCls,
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => scrollBy(1)}
        className={cn(
          "absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 rounded-full border p-2 md:flex",
          arrowCls,
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const VideoCard = ({
  video,
  formatMoney,
}: {
  video: LiveVideo;
  formatMoney: (n: number | null | undefined) => string;
}) => {
  const [mediaFailed, setMediaFailed] = useState(false);
  useEffect(() => setMediaFailed(false), [video.video_mp4_url]);
  if (!video.video_mp4_url?.trim() || mediaFailed) return null;
  const handle =
    video.creator_handle ||
    (video.creator_name ? `@${video.creator_name.replace(/\s+/g, "").toLowerCase()}` : "@creador");
  // "Comisión estimada ≈" only when we have a commission %. Never invent it.
  const commission = video.product?.commission ?? null;
  const creatorEarned =
    commission != null && video.revenue_mxn != null
      ? video.revenue_mxn * (commission / 100)
      : null;

  return (
    <div
      className="group relative w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-card border border-white/10 bg-white/[0.03] text-left"
    >
      <div className="min-w-0 space-y-0.5 px-3 py-2.5">
        <p className="truncate text-xs font-semibold text-white">{handle.startsWith('@') ? handle : `@${handle}`}</p>
        {video.product_name && (
          <p className="truncate text-[11px] text-white/70" title={video.product_name}>{video.product_name}</p>
        )}
      </div>
      <div className="relative aspect-[9/13] w-full overflow-hidden bg-brand-ink-800">
        {video.video_mp4_url ? (
          // Solo las tarjetas visibles preparan un fotograma; reproducir requiere un clic.
          <LandingVideo
            video={video}
            onError={() => setMediaFailed(true)}
            label={`Reproducir video de ${handle}`}
            className="h-full w-full object-cover"
          />
        ) : video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title || "Video"}
            loading="lazy"
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-brand-ink-800" />
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-brand-mist/40">
            Ventas según el reporte
          </p>
          <p className="font-mono tabular-nums text-money-md font-bold text-brand-cyan">
            {formatMoney(video.revenue_mxn)}
          </p>
        </div>
        <p className="text-[10px] leading-relaxed text-brand-mist/55">
          {video.snapshot_date_range ? formatReportPeriod(video.snapshot_date_range) : "Período no disponible"}
        </p>
        {creatorEarned != null && (
          <p className="text-[11px] text-brand-money">
            Comisión estimada ≈ {formatMoney(creatorEarned)}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1 text-[11px] text-brand-mist/50">
          {video.sales != null && <span>{compact(video.sales)} uds</span>}
          {video.views != null && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {compact(video.views)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const OppCard = ({
  opp,
  formatMoney,
  onClick,
}: {
  opp: LiveOpportunity;
  formatMoney: (n: number | null | undefined) => string;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-card border border-brand-ink/10 bg-white text-left shadow-card-tactile transition-shadow hover:shadow-card-tactile-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-brand-mist-100">
        {opp.imagen_url ? (
          <img
            src={opp.imagen_url}
            alt={opp.producto_nombre || "Producto"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-brand-ink/15" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {opp.is_hidden_gem && (
            <span className="rounded-pill bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-sm">
              💎 Señal de oportunidad
            </span>
          )}
          {opp.is_high_pay && (
            <span className="rounded-pill bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-sm">
              💰 Comisión destacada
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-brand-ink">
          {opp.producto_nombre || "Producto"}
        </p>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-brand-ink/40">
            Ventas según el reporte
          </p>
          <p className="font-mono tabular-nums text-money-md font-bold text-brand-ink">
            {formatMoney(opp.gmv_30d_calc)}
          </p>
        </div>
        {(opp.earning_per_sale ?? 0) > 0 && (
          <p className="text-[11px] font-medium text-brand-money-600">
            ~{formatMoney(opp.earning_per_sale)} por venta
          </p>
        )}
      </div>
    </button>
  );
};

const VideoSkeleton = () => (
  <div className="w-[200px] flex-shrink-0 overflow-hidden rounded-card border border-white/10 bg-white/[0.03]">
    <div className="aspect-[9/13] w-full animate-pulse bg-white/5" />
    <div className="space-y-2 p-3">
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
    </div>
  </div>
);

const OppSkeleton = () => (
  <div className="w-[200px] flex-shrink-0 overflow-hidden rounded-card border border-brand-ink/10 bg-white shadow-card-tactile">
    <div className="aspect-square w-full animate-pulse bg-brand-ink/5" />
    <div className="space-y-2 p-3">
      <div className="h-3 w-2/3 animate-pulse rounded bg-brand-ink/10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-brand-ink/10" />
    </div>
  </div>
);

const FAQItem = ({
  q,
  a,
  index,
  onOpen,
}: {
  q: string;
  a: string;
  index: number;
  onOpen: (i: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen(index);
  };
  return (
    <div className="overflow-hidden rounded-card border border-brand-ink/10 bg-white shadow-card-tactile">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={toggle}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-brand-ink md:text-base">{q}</span>
        <span
          className={cn(
            "flex size-6 flex-shrink-0 items-center justify-center rounded-full border border-brand-ink/15 text-sm transition-transform",
            open && "rotate-45 border-brand-pink bg-brand-pink text-white",
          )}
          aria-hidden
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed text-brand-ink/65">
          {a}
        </div>
      )}
    </div>
  );
};

/* ----------------------- helpers + fallbacks ------------------------ */

const compact = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export default Landing;
