import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Flame,
  Play,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MoneyNumber } from "@/components/brand/MoneyNumber";
import { TrustBar } from "@/components/brand/TrustBar";
import {
  Events,
  clearMark,
  mark,
  measureSince,
  track,
  trackStandard,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

/* =====================================================================
 * Variante E — narrative hero + live proof + Top20 mock + guion demo
 * See docs/design/landing-shotgun.md §Variante E for the synthesis rules.
 * Tokens live in src/styles/tokens.css and tailwind.config.ts extend.
 * ===================================================================== */

const formatMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

const formatCompact = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/* ----------------------- content (single source) ---------------------- */

const spotlightCreators = [
  { handle: "@marianacrea", product: "Serum Vitamina C", revenue: 482500, roas: 4.8 },
  { handle: "@javi.fit", product: "Resistencia Pro", revenue: 311200, roas: 3.6 },
  { handle: "@casadelulu", product: "Set Antiadherentes", revenue: 268900, roas: 5.1 },
  { handle: "@susanavibes", product: "Labial Matte 24h", revenue: 214300, roas: 4.2 },
  { handle: "@keto.rodri", product: "Proteína Whey 2kg", revenue: 198700, roas: 3.1 },
];

const top20Mock = [
  { rank: 1, product: "Serum Vitamina C 30ml", creator: "@marianacrea", revenue: 482500, views: 2400000, roas: 4.8 },
  { rank: 2, product: "Resistencia Pro Kit", creator: "@javi.fit", revenue: 311200, views: 1700000, roas: 3.6 },
  { rank: 3, product: "Sartenes Antiadherentes x5", creator: "@casadelulu", revenue: 268900, views: 985000, roas: 5.1 },
  { rank: 4, product: "Labial Matte 24h", creator: "@susanavibes", revenue: 214300, views: 742000, roas: 4.2 },
  { rank: 5, product: "Proteína Whey 2kg", creator: "@keto.rodri", revenue: 198700, views: 612000, roas: 3.1 },
];

type GuionVariant = "transcrito" | "ia_optimizado" | "ia_agresivo";

const guionVariants: Record<
  GuionVariant,
  { label: string; tone: string; body: string }
> = {
  transcrito: {
    label: "Transcrito",
    tone: "Lo que dijo el creador original, palabra por palabra",
    body: 'Miren esto, llevo tres semanas usando este serum y mi piel cambió por completo. El truco es aplicarlo antes del bloqueador. Les dejo el link aquí abajo para que lo vean, yo ya compré tres.',
  },
  ia_optimizado: {
    label: "Optimizado IA",
    tone: "Reescrito para tu producto, mismo hook, mismo ritmo",
    body: 'Tres semanas con este [TU_PRODUCTO] y noto la diferencia real. El truco está en cuándo lo uses, no en cuánto. Les explico en 15 segundos por qué ya compré tres. Link abajo.',
  },
  ia_agresivo: {
    label: "Agresivo",
    tone: "Hook más fuerte, urgencia, directo al CTA",
    body: 'Spoiler: este [TU_PRODUCTO] hizo lo que 5 productos caros no pudieron. Tres semanas, resultados reales, y sí, ya compré tres. Última pregunta: ¿lo vas a probar o vas a seguir gastando en lo mismo? Link abajo.',
  },
};

const trustStats = [
  { value: "$847K", label: "GMV rastreado hoy" },
  { value: "20 / día", label: "Videos actualizados" },
  { value: "< 24 h", label: "Desde venta a tu dashboard" },
  { value: "3.8x", label: "ROAS promedio top 20" },
];

const faqs = [
  {
    q: "¿De dónde vienen los datos?",
    a: "Exports oficiales de Kalodata, el proveedor de datos más confiable de TikTok Shop. Los datos son verificados directamente contra el sistema de TikTok, no estimados.",
  },
  {
    q: "¿Cada cuánto se actualizan?",
    a: "Cada mañana antes de las 8am CDMX. El top del día anterior se procesa durante la madrugada y ya está en tu dashboard cuando te despiertas.",
  },
  {
    q: "¿Los guiones son confiables?",
    a: "Cada video se transcribe automáticamente, y luego se reescribe con IA en tres versiones: original, optimizada para tu producto, y agresiva para CTA. Todo adaptado a la forma de hablar de México.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, en un click, sin letra chica. Pagas $499 MXN al mes y cancelas desde el dashboard. No tocamos tu tarjeta si cancelas antes del siguiente cobro.",
  },
];

/* ============================== page ============================== */

const Landing = () => {
  const navigate = useNavigate();

  const [guionVariant, setGuionVariant] = useState<GuionVariant>("ia_optimizado");
  const [copied, setCopied] = useState(false);
  const [liveCounter, setLiveCounter] = useState(847342);

  const pricingRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const pricingFired = useRef(false);
  const footerFired = useRef(false);

  /* Live counter drifts +$1–$30 MXN every ~2s to feel alive without
   * needing a backend. Accessibility: pauses if prefers-reduced-motion. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setLiveCounter((prev) => prev + Math.floor(Math.random() * 30) + 1);
    }, 2100);
    return () => window.clearInterval(id);
  }, []);

  /* IntersectionObserver for pricing / footer section-view events. */
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

  const goRegister = (location: string) => {
    track(Events.LandingCtaClicked, { location, destination: "register" });
    trackStandard("Lead", { location });
    navigate("/register");
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
      trackStandard("Customize", { surface: "landing_demo" });
    } catch {
      /* clipboard blocked — silent fallback */
    }
  };

  const onFaqOpen = (index: number) => {
    track(Events.LandingFaqOpened, { question_index: index });
  };

  const counterFormatted = useMemo(
    () => formatMXN(liveCounter),
    [liveCounter],
  );

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

        <div className="relative mx-auto max-w-6xl px-[var(--page-pad-x)] pt-24 pb-24 md:pt-28 md:pb-32">
          {/* urgency chip */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-brand-pink/40 bg-brand-pink/10 px-4 py-1.5 text-micro text-brand-pink-200 backdrop-blur animate-fade-in-up motion-reduce:animate-none">
              <span className="relative inline-flex size-2">
                <span className="absolute inset-0 rounded-full bg-brand-pink animate-pulse-glow-pink motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-brand-pink" />
              </span>
              50 % OFF · primeros 100 creadores · quedan 37
            </span>
          </div>

          {/* narrative H1 */}
          <h1 className="text-center text-display-lg md:text-display-xl font-display font-extrabold tracking-tight text-balance max-w-4xl mx-auto">
            Ana se despertó a las 6 am y vio que{" "}
            <span className="text-brand-pink">Susana ganó</span>{" "}
            <MoneyNumber
              value={14320}
              size="xl"
              className="inline-block align-baseline text-brand-pink"
            />{" "}
            ayer con este video.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-center text-lg md:text-xl leading-relaxed text-brand-mist/75">
            Adbroll te entrega cada mañana los 20 videos con más ventas reales de
            TikTok Shop México, con el guión transcrito y listo para adaptar a tu
            producto. Sin adivinar. Sin scrollear ocho horas. Antes del café.
          </p>

          {/* CTA row */}
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              variant="brand"
              size="brand-xl"
              onClick={() => goRegister("hero")}
              className="w-full sm:w-auto"
            >
              Ver el Top 20 de hoy
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
            <Button
              variant="ghost-dark"
              size="brand-xl"
              onClick={() => goLogin("hero")}
              className="w-full sm:w-auto"
            >
              <Play className="mr-1 h-4 w-4" />
              Ya tengo cuenta
            </Button>
          </div>

          {/* live GMV counter */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <span className="text-micro uppercase tracking-[0.12em] text-brand-mist/55">
              Rastreado hoy en TikTok Shop México
            </span>
            <span className="font-mono tabular-nums text-money-xl text-brand-cyan">
              {counterFormatted}
            </span>
          </div>

          {/* trust line */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-brand-mist/60">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-brand-cyan" />
              Datos oficiales Kalodata
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-cyan" />
              Actualizado cada mañana
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-brand-cyan" />
              Sin tarjeta de crédito
            </span>
          </div>
        </div>
      </section>

      {/* ===================== CREATOR SPOTLIGHT STRIP ===================== */}
      <section className="bg-brand-ink text-brand-mist border-y border-white/5">
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <span className="text-micro uppercase text-brand-mist/50">
              Creadores del top 5 · ayer
            </span>
            <span className="text-micro uppercase text-brand-cyan">
              <Flame className="mr-1 inline h-3 w-3" />
              en vivo
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {spotlightCreators.map((c, i) => (
              <div
                key={c.handle}
                className={cn(
                  "rounded-card border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]",
                  i === 0 && "ring-1 ring-brand-pink/40",
                )}
              >
                <div className="mb-1 text-xs font-semibold text-brand-mist/90">
                  {c.handle}
                </div>
                <div className="mb-3 text-xs text-brand-mist/50">{c.product}</div>
                <div className="font-mono tabular-nums text-money-md text-brand-cyan">
                  {formatMXN(c.revenue)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-brand-mist/40">
                  ROAS {c.roas.toFixed(1)}x
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TOP 20 MOCK WITH BLUR UNLOCK ===================== */}
      <section className="bg-brand-mist">
        <div className="mx-auto max-w-5xl px-[var(--page-pad-x)] py-20 md:py-28">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-pink">
              El dashboard
            </span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight text-brand-ink">
              Top 20 videos · hoy
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-ink/60">
              Ordenado por ingresos reales. Desbloqueas los 15 restantes cuando
              creas tu cuenta.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-card border border-brand-ink/10 bg-white shadow-card-tactile-lg">
            {/* fake browser chrome */}
            <div className="flex items-center gap-2 border-b border-brand-ink/5 bg-brand-mist-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
              <span className="mx-auto rounded-button bg-white px-3 py-1 font-mono text-[11px] text-brand-ink/60 shadow-sm">
                adbroll.com/app/top20
              </span>
            </div>

            {/* rows */}
            <div className="divide-y divide-brand-ink/5">
              {top20Mock.map((row) => (
                <div
                  key={row.rank}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-mist-100"
                >
                  <div className="flex size-9 items-center justify-center rounded-button bg-brand-pink/10 font-mono text-sm font-bold text-brand-pink">
                    #{row.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.product}</p>
                    <p className="truncate text-xs text-brand-ink/50">
                      {row.creator} · {formatCompact(row.views)} views
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono tabular-nums text-sm font-bold">
                      {formatMXN(row.revenue)}
                    </p>
                    <p className="text-[10px] text-brand-money">
                      ROAS {row.roas.toFixed(1)}x
                    </p>
                  </div>
                </div>
              ))}

              {/* blurred rows 6–20 */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 blur-sm select-none"
                  aria-hidden
                >
                  <div className="flex size-9 items-center justify-center rounded-button bg-brand-ink/5 font-mono text-sm font-bold text-brand-ink/30">
                    #{i + 6}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-48 rounded bg-brand-ink/10" />
                    <div className="mt-2 h-2 w-32 rounded bg-brand-ink/10" />
                  </div>
                  <div className="h-3 w-16 rounded bg-brand-ink/10" />
                </div>
              ))}
            </div>

            {/* unlock overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <Button
                variant="brand"
                size="brand-lg"
                onClick={() => goRegister("top20_unlock")}
                className="shadow-card-tactile-lg"
              >
                Desbloquear los 20 videos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== GUION DEMO (3 TABS) ===================== */}
      <section className="bg-brand-ink text-brand-mist">
        <div className="mx-auto max-w-5xl px-[var(--page-pad-x)] py-20 md:py-28">
          <div className="mb-10 text-center">
            <span className="text-micro uppercase text-brand-cyan">
              El guión
            </span>
            <h2 className="mt-3 text-display-md md:text-display-lg font-display font-extrabold tracking-tight">
              Tres versiones por video. Una te queda.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-mist/60">
              Transcripción literal, reescritura para tu producto, y versión
              agresiva con hook fuerte. Copias la que te queda, cambias el
              nombre, publicas.
            </p>
          </div>

          <div className="rounded-card border border-white/10 bg-white/[0.03] p-6 md:p-8">
            {/* tabs */}
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
                Basado en el #1 del top de ayer
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

      {/* ===================== TRUST STATS ===================== */}
      <section className="bg-brand-mist border-y border-brand-ink/5">
        <div className="mx-auto max-w-5xl px-[var(--page-pad-x)] py-16">
          <TrustBar stats={trustStats} tone="dark" />
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section
        ref={pricingRef}
        className="bg-brand-mist"
      >
        <div className="mx-auto max-w-4xl px-[var(--page-pad-x)] py-20 md:py-28">
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
                <div className="mb-2 inline-flex items-center gap-2 rounded-pill bg-brand-pink/15 px-3 py-1 text-micro text-brand-pink-200">
                  <Zap className="h-3 w-3" />
                  Primeros 100 · 50 % OFF
                </div>
                <div className="mb-3 flex items-baseline gap-3">
                  <MoneyNumber value={249} currency="MXN" size="xl" className="text-brand-mist" />
                  <span className="text-brand-mist/50">/mes</span>
                </div>
                <p className="text-sm text-brand-mist/55 line-through">
                  Antes $499 MXN · $25 USD
                </p>
                <ul className="mt-6 space-y-2 text-sm text-brand-mist/80">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Top 20 videos de TikTok Shop México, cada mañana
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Guión transcrito + 2 versiones reescritas por IA
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Métricas en MXN: ingresos, GPM, ROAS, ventas
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-cyan" />
                    Cancelas en un click. Sin letra chica.
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="brand"
                  size="brand-xl"
                  onClick={() => goRegister("pricing")}
                  className="w-full"
                >
                  Empezar por $249 MXN
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
                <p className="text-center text-xs text-brand-mist/40">
                  Cobra $249 MXN el primer mes, luego $499. Cancelas cuando quieras.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="bg-brand-mist">
        <div className="mx-auto max-w-3xl px-[var(--page-pad-x)] py-20">
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
      <section className="bg-brand-mist pb-20">
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
                El Top 20 de mañana sale en unas horas. ¿Lo quieres antes que tu
                competencia?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Sin tarjeta para ver la demo. Los primeros 100 pagan $249 el primer
                mes.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  variant="cyber"
                  size="brand-xl"
                  onClick={() => goRegister("final_cta")}
                >
                  Crear cuenta gratis
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer
        ref={footerRef}
        className="border-t border-brand-ink/10 bg-brand-mist"
      >
        <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-12">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-col items-center md:items-start gap-1">
              <BrandLogo tone="dark" />
              <p className="text-sm text-brand-ink/50">
                Datos reales de TikTok Shop México.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-brand-ink/55">
              <a href="/login" className="hover:text-brand-ink">
                Login
              </a>
              <a href="/register" className="hover:text-brand-ink">
                Registro
              </a>
              <a href="mailto:hola@adbroll.com" className="hover:text-brand-ink">
                Contacto
              </a>
            </div>
            <p className="text-xs text-brand-ink/40">
              © {new Date().getFullYear()} adbroll. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ============================== atoms ============================== */

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

export default Landing;
