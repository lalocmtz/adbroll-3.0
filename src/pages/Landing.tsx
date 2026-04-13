import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  Play,
  TrendingUp,
  Flame,
  ShieldCheck,
  Clock,
  Target,
  Brain,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import GlobalHeader from "@/components/GlobalHeader";

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

const heroVideos = [
  {
    creator: "@marianacrea",
    product: "Serum Vitamina C 30ml",
    revenue: 482500,
    sales: 1840,
    views: 2_400_000,
    gpm: 201,
    roas: 4.8,
  },
  {
    creator: "@javi.fit",
    product: "Resistencia Pro Kit",
    revenue: 311200,
    sales: 1205,
    views: 1_700_000,
    gpm: 183,
    roas: 3.6,
  },
  {
    creator: "@casadelulu",
    product: "Set de Sartenes Antiadherentes",
    revenue: 268900,
    sales: 742,
    views: 985_000,
    gpm: 273,
    roas: 5.1,
  },
];

const trustBadges = [
  "Datos oficiales de Kalodata",
  "Actualización diaria",
  "Solo México · CDMX timezone",
  "Sin tarjeta de crédito",
];

const Landing = () => {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState(0);
  const video = heroVideos[selectedVideo];

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader showMenu={false} />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background grid with fade */}
        <div
          className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[1100px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--primary) / 0.20), transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative container mx-auto px-4 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            <Badge
              variant="secondary"
              className="text-xs tracking-wide uppercase px-3 py-1.5 border border-primary/20 bg-primary/5 text-primary"
            >
              <Flame className="h-3 w-3 mr-1.5 inline" />
              Top 20 TikTok Shop México · Actualizado hoy
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold text-balance leading-[1.05] tracking-tight">
              Deja de adivinar qué creativo sube.{" "}
              <span className="gradient-text">Copia el que ya está vendiendo.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              Adbroll te da cada mañana los <strong className="text-foreground">20 videos con más
              ingresos de TikTok Shop en México</strong>, con guión transcrito,
              versión optimizada por IA y métricas reales. Adaptas, publicas, vendes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
              <Button
                size="lg"
                className="text-base px-7 py-6 h-auto glow-primary"
                onClick={() => navigate("/register")}
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-7 py-6 h-auto"
                onClick={() => navigate("/login")}
              >
                <Play className="h-4 w-4 mr-2" />
                Ver demo en vivo
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-4 text-sm text-muted-foreground">
              {trustBadges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* ===================== HERO PRODUCT MOCKUP ===================== */}
          <div className="relative mt-14 md:mt-20 max-w-6xl mx-auto">
            <Card className="relative overflow-hidden border-border/80 shadow-2xl glow-primary">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <span className="h-3 w-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background/80 border border-border text-xs text-muted-foreground font-mono">
                    adbroll.com/app
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-success/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                  LIVE
                </Badge>
              </div>

              <div className="grid md:grid-cols-[1.1fr_1fr] bg-card">
                {/* Left: Top 20 list */}
                <div className="border-b md:border-b-0 md:border-r border-border">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Top 20 videos · hoy</p>
                      <p className="text-xs text-muted-foreground">
                        Ordenado por ingresos MXN
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      hace 4 h
                    </Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {heroVideos.map((v, i) => {
                      const active = i === selectedVideo;
                      return (
                        <button
                          key={v.creator}
                          onClick={() => setSelectedVideo(i)}
                          className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                            active
                              ? "bg-primary/5"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            #{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {v.product}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {v.creator} · {formatCompact(v.views)} views
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatMXN(v.revenue)}
                            </p>
                            <p className="text-[10px] text-success">
                              ROAS {v.roas.toFixed(1)}x
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-5 py-3.5 opacity-40"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                          #{i + 4}
                        </div>
                        <div className="flex-1">
                          <div className="h-3 w-40 rounded bg-muted" />
                          <div className="h-2 w-24 rounded bg-muted mt-2" />
                        </div>
                        <div className="h-3 w-16 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Selected video detail */}
                <div className="p-5 space-y-4 bg-gradient-to-br from-background to-primary/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Video seleccionado</p>
                      <p className="text-base font-semibold truncate">
                        {video.product}
                      </p>
                      <p className="text-xs text-muted-foreground">{video.creator}</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20 border">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <MetricTile label="Ingresos" value={formatMXN(video.revenue)} accent />
                    <MetricTile label="Ventas" value={video.sales.toLocaleString("es-MX")} />
                    <MetricTile label="GPM" value={formatMXN(video.gpm)} />
                    <MetricTile label="ROAS" value={`${video.roas.toFixed(1)}x`} />
                  </div>

                  <div className="rounded-lg border border-border bg-background/80 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">
                        Guión optimizado por IA
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                      &quot;Llevo 3 semanas usando esto y mi piel cambió por completo. Te
                      enseño cómo aplicarlo en 15 segundos para que veas resultados
                      igual que yo. Spoiler: el truco está en el paso 2…&quot;
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary" className="text-[10px]">Hook</Badge>
                      <Badge variant="secondary" className="text-[10px]">Beneficio</Badge>
                      <Badge variant="secondary" className="text-[10px]">CTA</Badge>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate("/register")}
                  >
                    Ver los 20 videos completos
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== STATS BAR ===================== */}
      <section className="border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StatCell value="20" suffix="/día" label="Videos actualizados" />
            <StatCell value="100%" label="Datos verificados Kalodata" />
            <StatCell value="3.8x" label="ROAS promedio del top 20" />
            <StatCell value="< 24h" label="Desde que vende hasta que lo ves" />
          </div>
        </div>
      </section>

      {/* ===================== PAIN → SOLUTION ===================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">
          <div>
            <Badge variant="outline" className="mb-4">El problema</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              Ver 8 horas de TikTok no es investigación de mercado.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Scrolleas, tomas notas, intentas adivinar qué video vendió.
              Copias hooks al azar, pruebas, fracasas. Cuando encuentras algo
              que funciona, ya pasó su momento.
            </p>
            <ul className="space-y-3 text-sm">
              <PainItem text="No sabes cuáles videos convirtieron en ventas reales" />
              <PainItem text="Pierdes días replicando creativos ya saturados" />
              <PainItem text="Tus guiones son copia-y-pega sin entender por qué funcionan" />
            </ul>
          </div>

          <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 border">
              La solución
            </Badge>
            <h3 className="text-2xl font-bold mb-4 text-balance">
              Una sola página con lo único que importa: qué está vendiendo y por qué.
            </h3>
            <ul className="space-y-4">
              <FeaturePoint
                icon={<Target className="h-4 w-4" />}
                title="Datos reales de Kalodata"
                body="Top 20 por ingresos MXN. Sin estimaciones, sin humo."
              />
              <FeaturePoint
                icon={<Brain className="h-4 w-4" />}
                title="Guión transcrito + reescrito por IA"
                body="Adaptado para vender en México. Copias, cambias tu producto, publicas."
              />
              <FeaturePoint
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Fresco cada mañana"
                body="Datos nuevos antes del café. Ejecutas el mismo día."
              />
            </ul>
          </Card>
        </div>
      </section>

      {/* ===================== FEATURES GRID ===================== */}
      <section className="border-y border-border bg-muted/20">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="outline" className="mb-4">Qué incluye</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para lanzar creativos ganadores
            </h2>
            <p className="text-muted-foreground">
              Diseñado para sellers y UGC creators en TikTok Shop México.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Top 20 videos con ingresos reales"
              body="Ordenados por ventas efectivas, no por views. Filtra por categoría y creador."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Guión original + versión IA"
              body="Transcripción automática del video y una reescritura optimizada para tu producto."
            />
            <FeatureCard
              icon={<Trophy className="h-5 w-5" />}
              title="Top productos y creadores"
              body="Ranking diario de los 50 productos y 100 creadores más rentables del día."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Creadores con contacto directo"
              body="Identifica UGC creators con tracción y contáctalos antes que la competencia."
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="ROAS, GPM y CPA en MXN"
              body="Métricas en pesos mexicanos. Nada de conversiones raras en USD."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Accionable en minutos"
              body="Abres la app, eliges un video, copias el guión, publicas. Así de simple."
            />
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Cómo funciona</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              De registro a primer video publicado en 10 minutos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-6 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <Step
              n={1}
              title="Crea tu cuenta"
              body="Sin tarjeta. Accedes al Top 20 del día al instante."
            />
            <Step
              n={2}
              title="Elige un ganador"
              body="Filtra por categoría, mira métricas reales, lee el guión optimizado."
            />
            <Step
              n={3}
              title="Adapta y publica"
              body="Copias, cambias tu producto, grabas en 15 minutos. Ya está vendido."
            />
          </div>
        </div>
      </section>

      {/* ===================== SOCIAL PROOF ===================== */}
      <section className="border-y border-border bg-muted/20">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Testimonios</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Sellers que ya dejaron de adivinar
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Testimonial
                quote="Antes gastaba 5 horas diarias en TikTok buscando ideas. Ahora abro adbroll, saco 3 guiones y grabo. Literalmente tripliqué mis lanzamientos."
                author="Mariana R."
                role="UGC Creator · CDMX"
              />
              <Testimonial
                quote="El guión reescrito por IA es lo que me hizo quedarme. Copiar y pegar textuales no funciona, pero con la versión adaptada sí."
                author="Javier T."
                role="Seller fitness · GDL"
              />
              <Testimonial
                quote="Es la única herramienta que me muestra datos de México en MXN. Todo lo demás estaba pensado para EU y era inútil aquí."
                author="Lulú H."
                role="Afiliada cocina · MTY"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Dudas frecuentes</h2>
          </div>
          <div className="space-y-4">
            <FAQItem
              q="¿De dónde vienen los datos?"
              a="Usamos exports oficiales de Kalodata (el proveedor de datos más confiable del mercado de TikTok Shop). Los datos son verificados, no estimados."
            />
            <FAQItem
              q="¿Cada cuánto se actualizan?"
              a="Cada 3 días por default, con opción a actualizaciones diarias. Los datos se procesan durante la madrugada y están listos antes de las 8am CDMX."
            />
            <FAQItem
              q="¿Los guiones son confiables?"
              a="Cada video se transcribe automáticamente y luego se reescribe con IA optimizando hook, beneficio y CTA. El resultado está adaptado a la forma de hablar de México."
            />
            <FAQItem
              q="¿Por qué solo 20 videos al día?"
              a="Porque más no sirve. Enfocamos el top real para que no pierdas tiempo eligiendo entre 200 videos mediocres."
            />
            <FAQItem
              q="¿Puedo cancelar cuando quiera?"
              a="Sí, en un click. Sin letra chica."
            />
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-5xl mx-auto p-10 md:p-16 text-center border-0 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)",
            }}
            aria-hidden
          />
          <div className="relative text-primary-foreground">
            <Zap className="h-10 w-10 mx-auto mb-5 opacity-90" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">
              El Top 20 de hoy sale en unas horas.
              <br />
              ¿Lo quieres antes que tu competencia?
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Sin tarjeta. Acceso inmediato al dashboard. Cancela cuando quieras.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 py-6 h-auto shadow-2xl"
              onClick={() => navigate("/register")}
            >
              Crear cuenta gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </Card>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold gradient-text">adbroll</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Datos reales de TikTok Shop México.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} adbroll. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ==================== atoms ==================== */

const MetricTile = ({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div
    className={`rounded-lg border p-3 ${
      accent
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-background/60"
    }`}
  >
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className={`text-base font-bold tabular-nums ${accent ? "text-primary" : ""}`}>
      {value}
    </p>
  </div>
);

const StatCell = ({
  value,
  suffix,
  label,
}: {
  value: string;
  suffix?: string;
  label: string;
}) => (
  <div className="text-center">
    <p className="text-3xl md:text-4xl font-bold tabular-nums">
      {value}
      {suffix && (
        <span className="text-base text-muted-foreground ml-1">{suffix}</span>
      )}
    </p>
    <p className="text-xs md:text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

const PainItem = ({ text }: { text: string }) => (
  <li className="flex gap-3 text-muted-foreground">
    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
    <span>{text}</span>
  </li>
);

const FeaturePoint = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <li className="flex gap-3">
    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {icon}
    </span>
    <div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  </li>
);

const FeatureCard = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <Card className="card-premium p-6">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
      {icon}
    </div>
    <h3 className="text-base font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
  </Card>
);

const Step = ({ n, title, body }: { n: number; title: string; body: string }) => (
  <div className="relative text-center">
    <div className="relative z-10 mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-background border-2 border-primary text-primary font-bold">
      {n}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{body}</p>
  </div>
);

const Testimonial = ({
  quote,
  author,
  role,
}: {
  quote: string;
  author: string;
  role: string;
}) => (
  <Card className="card-premium p-6">
    <div className="mb-4 flex gap-0.5 text-primary">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
    <p className="text-sm text-foreground leading-relaxed mb-5">
      &ldquo;{quote}&rdquo;
    </p>
    <div className="flex items-center gap-3 pt-4 border-t border-border">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
        {author.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-semibold">{author}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  </Card>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden border-border">
      <button
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold text-sm md:text-base pr-4">{q}</span>
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border text-sm transition-transform ${
            open ? "rotate-45 bg-primary text-primary-foreground border-primary" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
          {a}
        </div>
      )}
    </Card>
  );
};

export default Landing;
