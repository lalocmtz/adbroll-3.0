import { Children, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Flame,
  Gem,
  PlayCircle,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
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

/* =====================================================================
 * TokXray landing — concepto: "TokXray analiza qué funciona HOY en
 * TikTok Shop por ti. Ve qué vende en tiempo real, qué se dijo en el
 * video y copia el guión." Sin mencionar la palabra prohibida.
 * Todos los CTA llevan directo a /app (app-first, gateada por blur).
 * ===================================================================== */

/* ------------------------- live data types -------------------------- */

interface LiveVideo {
  id: string;
  thumbnail_url: string | null;
  video_mp4_url: string | null;
  title: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  revenue_mxn: number | null;
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

type GuionVariant = "transcrito" | "ia_optimizado" | "ia_agresivo";

const guionVariants: Record<
  GuionVariant,
  { label: string; tone: string; body: string }
> = {
  transcrito: {
    label: "Transcrito",
    tone: "Lo que dijo el creador, palabra por palabra",
    body: 'Miren esto, llevo tres semanas usando este serum y mi piel cambió por completo. El truco es aplicarlo antes del bloqueador. Les dejo el link aquí abajo, yo ya compré tres.',
  },
  ia_optimizado: {
    label: "Optimizado",
    tone: "Reescrito para tu producto, mismo hook, mismo ritmo",
    body: 'Tres semanas con este [TU_PRODUCTO] y noto la diferencia real. El truco está en cuándo lo usas, no en cuánto. Te explico en 15 segundos por qué ya compré tres. Link abajo.',
  },
  ia_agresivo: {
    label: "Agresivo",
    tone: "Hook más fuerte, urgencia, directo al CTA",
    body: 'Spoiler: este [TU_PRODUCTO] hizo lo que 5 productos caros no pudieron. Tres semanas, resultados reales, y sí, ya compré tres. ¿Lo vas a probar o vas a seguir gastando en lo mismo? Link abajo.',
  },
};

const faqs = [
  {
    q: "¿Qué es TokXray?",
    a: "TokXray analiza por ti qué está vendiendo HOY en TikTok Shop. Cada mañana ves los videos que más venden, cuánto generaron y exactamente qué se dijo en ellos, con el guión listo para copiar y adaptar a tu producto.",
  },
  {
    q: "¿Cada cuánto se actualiza?",
    a: "Cada mañana. Lo que más vendió se procesa de madrugada y ya está en tu panel cuando despiertas. Siempre ves lo que está funcionando ahora, no lo de hace meses.",
  },
  {
    q: "¿Puedo copiar los guiones?",
    a: "Sí. Cada video trae su guión transcrito más versiones reescritas: una optimizada para tu producto y otra más agresiva. Copias la que te queda, cambias el nombre del producto y publicas.",
  },
  {
    q: "¿Cómo veo las oportunidades?",
    a: "TokXray te marca los productos que venden mucho, con pocos creadores compitiendo y con mejor comisión. Así sabes qué empujar antes de que se sature.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, en un clic, sin letra chica. No tocamos tu tarjeta si cancelas antes del siguiente cobro.",
  },
];

const PRICE_USD = 24.99;

/* ============================== page ============================== */

const Landing = () => {
  const navigate = useNavigate();
  const { market } = useMarket();
  const { formatMoney } = useLanguage();

  const [videos, setVideos] = useState<LiveVideo[]>([]);
  const [opps, setOpps] = useState<LiveOpportunity[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [oppsLoading, setOppsLoading] = useState(true);

  const [guionVariant, setGuionVariant] = useState<GuionVariant>("ia_optimizado");
  const [copied, setCopied] = useState(false);

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
             revenue_mxn, sales, views, product_name, product_id,
             product:products!product_id ( commission )`,
          )
          .eq("country", market)
          .not("rank", "is", null)
          .not("product_id", "is", null)
          .not("video_mp4_url", "is", null)
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

  const goLogin = (location: string) => {
    track(Events.LandingCtaClicked, { location, destination: "login" });
    navigate("/login");
  };

  const onSelectVariant = (variant: GuionVariant) => {
    setGuionVariant(variant);
    track(Events.GuionVariantSelected, { variant });
    if (variant !== "transcrito") mark("guion.demo.opened");
  };

  const onCopyGuion = async () => {
    const body = guionVariants[guionVariant].body;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      const time_to_copy_ms = measureSince("guion.demo.opened");
      clearMark("guion.demo.opened");
      track(Events.GuionCopied, {
        variant: guionVariant,
        product_id: "landing_demo",
        time_to_copy_ms,
      });
    } catch {
      /* clipboard blocked — silent */
    }
  };

  const onFaqOpen = (index: number) => {
    track(Events.LandingFaqOpened, { question_index: index });
  };

  // Charged in USD; the headline shows the canonical USD price. For MX we
  // additionally surface an approximate MXN equivalent below it.
  const priceLabel = `$${PRICE_USD.toFixed(2)} USD`;

  return (
    <div className="min-h-screen bg-brand-mist text-brand-ink">
      <GlobalHeader showMenu={false} />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden bg-gradient-ink text-brand-mist">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 20% 0%, rgba(254,44,85,0.35), transparent 60%), radial-gradient(50rem 25rem at 85% 20%, rgba(37,244,238,0.22), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-[var(--page-pad-x)] pt-16 pb-16 md:pt-24 md:pb-24">
          {/* live chip */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-1.5 text-micro text-brand-cyan-200 backdrop-blur">
              <span className="relative inline-flex size-2">
                <span className="absolute inset-0 rounded-full bg-brand-cyan animate-ping motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-brand-cyan" />
              </span>
              Lo que vende AHORA en TikTok Shop
            </span>
          </div>

          {/* concept-first H1 */}
          <h1 className="text-center text-display-lg md:text-display-xl font-display font-extrabold tracking-tight text-balance max-w-3xl mx-auto leading-[1.05]">
            Ve qué está{" "}
            <span className="text-brand-pink">vendiendo hoy</span> en TikTok
            Shop, qué dijeron en el video y{" "}
            <span className="text-brand-cyan">copia el guión.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-center text-base md:text-xl leading-relaxed text-brand-mist/75">
            TokXray analiza por ti qué funciona en este momento. Cada mañana ves
            los videos que más venden, cuánto generaron y el guión completo,
            listo para adaptar a tu producto.
          </p>

          {/* CTA row */}
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="brand"
              size="brand-xl"
              onClick={() => goApp("hero")}
              className="w-full sm:w-auto"
            >
              Ver lo que vende hoy
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button
              variant="ghost-dark"
              size="brand-xl"
              onClick={() => goLogin("hero")}
              className="w-full sm:w-auto"
            >
              Ya tengo cuenta
            </Button>
          </div>

          {/* trust line */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-brand-mist/60">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
              Actualizado cada mañana
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-brand-cyan" />
              Empieza sin tarjeta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5 text-brand-cyan" />
              Guiones listos para copiar
            </span>
          </div>
        </div>
      </section>

      {/* ===================== LIVE VIDEOS CAROUSEL ===================== */}
      <section className="bg-brand-ink text-brand-mist border-b border-white/5">
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-14 md:py-20">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="text-micro uppercase text-brand-cyan inline-flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />
                Videos que más venden · hoy
              </span>
              <h2 className="mt-2 text-display-md font-display font-extrabold tracking-tight">
                Mira lo que está funcionando ahora
              </h2>
            </div>
          </div>

          <HScroll
            ariaLabel="Videos que más venden"
            animate={!videosLoading}
            direction="left"
          >
            {videosLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <VideoSkeleton key={i} />
                ))
              : (videos.length ? videos : FALLBACK_VIDEOS).map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    formatMoney={formatMoney}
                  />
                ))}
          </HScroll>

          <div className="mt-6 flex justify-center">
            <Button variant="brand-outline" size="brand-md" onClick={() => goApp("video_carousel_cta")}>
              Ver el top completo
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
              Productos con oportunidad · hoy
            </span>
            <h2 className="mt-2 text-display-md font-display font-extrabold tracking-tight text-brand-ink">
              Dónde hay dinero antes de que se sature
            </h2>
            <p className="mt-2 max-w-xl text-brand-ink/60">
              Productos que venden mucho, con pocos creadores compitiendo y
              mejor comisión. Aquí es donde conviene entrar.
            </p>
          </div>

          <HScroll
            ariaLabel="Productos con oportunidad"
            tone="light"
            animate={!oppsLoading}
            direction="right"
          >
            {oppsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <OppSkeleton key={i} />
                ))
              : (opps.length ? opps : FALLBACK_OPPS).map((p) => (
                  <OppCard
                    key={p.id}
                    opp={p}
                    formatMoney={formatMoney}
                    onClick={() => goApp("opp_carousel")}
                  />
                ))}
          </HScroll>

          <div className="mt-6 flex justify-center">
            <Button variant="brand" size="brand-md" onClick={() => goApp("opp_carousel_cta")}>
              Ver todas las oportunidades
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== GUION DEMO ===================== */}
      <section className="bg-brand-ink text-brand-mist">
        <div className="mx-auto max-w-4xl px-[var(--page-pad-x)] py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-cyan">El guión</span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight">
              Cada video trae su guión, listo para copiar
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-mist/60">
              Transcripción literal de lo que dijeron, más dos versiones
              reescritas para tu producto. Copias la que te queda, cambias el
              nombre y publicas.
            </p>
          </div>

          <div className="rounded-card border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="mb-6 flex flex-wrap gap-2" role="tablist">
              {(Object.keys(guionVariants) as GuionVariant[]).map((key) => {
                const active = guionVariant === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelectVariant(key)}
                    className={cn(
                      "rounded-button px-4 py-2 text-sm font-semibold transition-colors min-h-touch",
                      active
                        ? "bg-brand-pink text-white shadow-brand-glow-pink"
                        : "bg-white/5 text-brand-mist/70 hover:bg-white/10",
                    )}
                  >
                    {guionVariants[key].label}
                  </button>
                );
              })}
            </div>

            <p className="mb-4 text-xs uppercase tracking-wide text-brand-mist/40">
              {guionVariants[guionVariant].tone}
            </p>

            <div
              role="tabpanel"
              className="rounded-button border border-white/10 bg-brand-ink-800 p-5 text-sm leading-relaxed text-brand-mist/90 animate-fade-in-up motion-reduce:animate-none"
              key={guionVariant}
            >
              {guionVariants[guionVariant].body}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-brand-mist/50">
                <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
                Ejemplo basado en un video del top
              </div>
              <Button
                variant={copied ? "cyber" : "brand-outline"}
                size="brand-md"
                onClick={onCopyGuion}
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" />
                    Copiar guión
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW OPPORTUNITIES WORK ===================== */}
      <section className="bg-brand-mist border-y border-brand-ink/5">
        <div className="mx-auto max-w-5xl px-[var(--page-pad-x)] py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-pink">
              Oportunidades reales
            </span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-brand-ink">
              Cómo TokXray detecta dónde hay dinero
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-ink/60">
              Una oportunidad real es la suma de tres cosas. TokXray las cruza
              por ti, cada mañana.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <PillarCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Vende mucho"
              body="Productos con ventas fuertes y constantes, no modas de un día."
            />
            <PillarCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Poca competencia"
              body="Todavía hay pocos creadores promoviéndolo: aún cabes tú."
              accent="cyan"
            />
            <PillarCard
              icon={<Wallet className="h-5 w-5" />}
              title="Mejor comisión"
              body="Pagan más por venta, así cada video que grabas rinde más."
            />
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section ref={pricingRef} className="bg-brand-mist">
        <div className="mx-auto max-w-4xl px-[var(--page-pad-x)] py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-pink">Precio</span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-brand-ink">
              Un plan. Un precio. Sin letra chica.
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
                    Se cobra en USD · ≈ {formatMoney(Math.round(PRICE_USD / 0.058))} al mes
                  </p>
                )}
                <ul className="mt-6 space-y-2 text-sm text-brand-mist/80">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Top 20 que más vende, cada mañana
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Guión transcrito + 2 versiones reescritas
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Oportunidades de productos detectadas por ti
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Analiza cualquier video pegando su link
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Cancelas en un clic. Sin letra chica.
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="brand"
                  size="brand-xl"
                  onClick={() => goApp("pricing")}
                  className="w-full"
                >
                  Empezar ahora
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
                <p className="text-center text-xs text-brand-mist/45">
                  Explora gratis primero. Cancelas cuando quieras.
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
            <span className="text-micro uppercase text-brand-pink">FAQ</span>
            <h2 className="mt-3 text-display-md font-display font-extrabold tracking-tight text-brand-ink">
              Dudas frecuentes
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
                  "radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-balance">
                Ve qué vende hoy y copia el guión antes que tu competencia.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Empieza gratis. Los primeros videos y su guión los ves sin
                pagar nada.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  variant="cyber"
                  size="brand-xl"
                  onClick={() => goApp("final_cta")}
                >
                  <PlayCircle className="mr-1.5 h-5 w-5" />
                  Ver lo que vende hoy
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
                Rayos X a TikTok Shop. Ve qué vende, copia el guión.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-brand-ink/55">
              <button onClick={() => navigate("/app")} className="hover:text-brand-ink">
                Entrar
              </button>
              <a href="/login" className="hover:text-brand-ink">
                Login
              </a>
              <a href="mailto:hola@tokxray.com" className="hover:text-brand-ink">
                Contacto
              </a>
            </div>
            <p className="text-xs text-brand-ink/40">
              © {new Date().getFullYear()} TokXray. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

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
  const handle =
    video.creator_handle ||
    (video.creator_name ? `@${video.creator_name.replace(/\s+/g, "").toLowerCase()}` : "@creador");
  // "El creador ganó ≈" only when we have a commission %. Never invent it.
  const commission = video.product?.commission ?? null;
  const creatorEarned =
    commission != null && video.revenue_mxn != null
      ? video.revenue_mxn * (commission / 100)
      : null;

  return (
    <div
      className="group relative w-[200px] flex-shrink-0 snap-start overflow-hidden rounded-card border border-white/10 bg-white/[0.03] text-left"
    >
      <div className="relative aspect-[9/13] w-full overflow-hidden bg-brand-ink-800">
        {video.video_mp4_url ? (
          // El video real se reproduce solo (muted/loop). pointer-events-none:
          // tocarlo NO abre nada; el gesto pasa al carrusel que se frena al tocar.
          <video
            src={video.video_mp4_url}
            poster={video.thumbnail_url || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="pointer-events-none h-full w-full object-cover"
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3">
          <p className="truncate text-xs font-semibold text-white">{handle}</p>
          {video.product_name && (
            <p className="truncate text-[11px] text-white/60">{video.product_name}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-brand-mist/40">
            Generó en ventas
          </p>
          <p className="font-mono tabular-nums text-money-md font-bold text-brand-cyan">
            {formatMoney(video.revenue_mxn)}
          </p>
        </div>
        {creatorEarned != null && (
          <p className="text-[11px] text-brand-money">
            El creador ganó ≈ {formatMoney(creatorEarned)}
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
              💎 Joya
            </span>
          )}
          {opp.is_high_pay && (
            <span className="rounded-pill bg-white/95 px-2 py-0.5 text-[11px] font-semibold shadow-sm">
              💰 Paga bien
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
            Vendió
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

const PillarCard = ({
  icon,
  title,
  body,
  accent = "pink",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent?: "pink" | "cyan";
}) => (
  <div className="rounded-card border border-brand-ink/10 bg-white p-6 shadow-card-tactile">
    <div
      className={cn(
        "mb-4 inline-flex size-11 items-center justify-center rounded-button",
        accent === "cyan"
          ? "bg-brand-cyan/15 text-brand-cyan-700"
          : "bg-brand-pink/10 text-brand-pink",
      )}
    >
      {icon}
    </div>
    <h3 className="mb-1.5 text-lg font-display font-bold text-brand-ink">{title}</h3>
    <p className="text-sm leading-relaxed text-brand-ink/60">{body}</p>
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

/* Used only if the live query returns nothing, so the rail is never empty. */
const FALLBACK_VIDEOS: LiveVideo[] = [
  {
    id: "fb-1",
    thumbnail_url: null,
    video_mp4_url: null,
    title: "Serum Vitamina C",
    creator_name: "Mariana",
    creator_handle: "@marianacrea",
    revenue_mxn: 482500,
    sales: 1240,
    views: 2400000,
    product_name: "Serum Vitamina C 30ml",
    product_id: null,
    product: { commission: 18 },
  },
  {
    id: "fb-2",
    thumbnail_url: null,
    video_mp4_url: null,
    title: "Resistencia Pro",
    creator_name: "Javi",
    creator_handle: "@javi.fit",
    revenue_mxn: 311200,
    sales: 870,
    views: 1700000,
    product_name: "Resistencia Pro Kit",
    product_id: null,
    product: { commission: 15 },
  },
  {
    id: "fb-3",
    thumbnail_url: null,
    video_mp4_url: null,
    title: "Set Antiadherentes",
    creator_name: "Lulu",
    creator_handle: "@casadelulu",
    revenue_mxn: 268900,
    sales: 640,
    views: 985000,
    product_name: "Sartenes Antiadherentes x5",
    product_id: null,
    product: { commission: 12 },
  },
  {
    id: "fb-4",
    thumbnail_url: null,
    video_mp4_url: null,
    title: "Labial Matte 24h",
    creator_name: "Susana",
    creator_handle: "@susanavibes",
    revenue_mxn: 214300,
    sales: 1530,
    views: 742000,
    product_name: "Labial Matte 24h",
    product_id: null,
    product: { commission: 20 },
  },
];

const FALLBACK_OPPS: LiveOpportunity[] = [
  {
    id: "fo-1",
    producto_nombre: "Serum Vitamina C 30ml",
    imagen_url: null,
    gmv_30d_calc: 482500,
    earning_per_sale: 64,
    is_hidden_gem: true,
    is_high_pay: false,
    opportunity_index: 92,
  },
  {
    id: "fo-2",
    producto_nombre: "Resistencia Pro Kit",
    imagen_url: null,
    gmv_30d_calc: 311200,
    earning_per_sale: 88,
    is_hidden_gem: false,
    is_high_pay: true,
    opportunity_index: 87,
  },
  {
    id: "fo-3",
    producto_nombre: "Sartenes Antiadherentes x5",
    imagen_url: null,
    gmv_30d_calc: 268900,
    earning_per_sale: 52,
    is_hidden_gem: true,
    is_high_pay: false,
    opportunity_index: 81,
  },
  {
    id: "fo-4",
    producto_nombre: "Labial Matte 24h",
    imagen_url: null,
    gmv_30d_calc: 214300,
    earning_per_sale: 41,
    is_hidden_gem: false,
    is_high_pay: true,
    opportunity_index: 78,
  },
];

export default Landing;
