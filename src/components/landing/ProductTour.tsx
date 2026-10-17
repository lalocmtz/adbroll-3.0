import { ArrowRight, Check, ScanText, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDemo } from "@/components/landing/ProductDemo";

type TourProps = { onExplore: (section: string) => void };

function ProductCapture({ name, alt, width, height }: { name: string; alt: string; width: number; height: number }) {
  return <a href={`/images/product-tour/${name}.webp`} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar captura: ${alt}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan">
    <img src={`/images/product-tour/${name}.webp`} alt={alt} width={width} height={height}
      loading="lazy" decoding="async" className="block h-auto w-full cursor-zoom-in rounded-xl border border-white/15" />
    <span className="mt-2 block text-right text-xs text-brand-mist/60 underline underline-offset-4 group-hover:text-brand-cyan">Ampliar captura</span>
  </a>;
}

export function ProductTour({ onExplore }: TourProps) {
  return <section aria-labelledby="tour-title" className="border-b border-white/10 bg-brand-ink text-brand-mist">
    <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-14 md:py-20">
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">Así se ve por dentro</p>
        <h2 id="tour-title" className="mt-3 font-display text-3xl font-extrabold text-balance md:text-5xl">Menos apuestas.<br />Más razones para vender.</h2>
        <p className="mt-4 max-w-xl leading-relaxed text-brand-mist/70">No necesitas otra lista de ideas. Necesitas saber qué producto merece tu tiempo y qué mensaje puede acercarte a la siguiente comisión.</p>
      </div>

      <ProductDemo />

      <article className="grid items-center gap-8 border-b border-white/10 pb-12 md:grid-cols-2 md:gap-14 md:pb-16">
        <div className="md:order-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-cyan"><TrendingUp className="size-4" />01 · ENCUENTRA QUÉ VENDE</p>
          <h3 className="mt-4 font-display text-3xl font-bold text-balance md:text-4xl">Ideas con ventas detrás.<br />No solo con likes.</h3>
          <p className="mt-4 leading-relaxed text-brand-mist/70">Deja de elegir productos solo porque aparecen en tu feed. Encuentra videos con ventas reportadas, compara cuánto vendieron y abre la referencia para entender cómo presentaron el producto.</p>
          <ul className="mt-5 space-y-3 text-sm text-brand-mist/80">
            {['Ventas, unidades y vistas en un mismo lugar', 'El producto y su comisión estimada', 'Filtros para encontrar la referencia que te interesa'].map(text => <li key={text} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" />{text}</li>)}
          </ul>
          <Button variant="brand" size="brand-lg" className="mt-7" onClick={() => onExplore('tour_videos')}>Ver qué está vendiendo <ArrowRight className="ml-1 size-4" /></Button>
        </div>
        <figure className="mx-auto w-full max-w-md md:order-1">
          <ProductCapture name="videos" alt="Catálogo real de TokXray con videos, ventas reportadas, unidades y comisión estimada" width={592} height={738} />
          <figcaption className="mt-3 text-center text-xs text-brand-mist/55">Captura real de TokXray · catálogo de videos</figcaption>
        </figure>
      </article>

      <article className="grid items-center gap-8 border-b border-white/10 py-12 md:grid-cols-[0.85fr_1.15fr] md:gap-10 md:py-16">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-cyan"><ScanText className="size-4" />02 · DESCIFRA CÓMO VENDE</p>
          <h3 className="mt-4 font-display text-3xl font-bold text-balance md:text-4xl">Un video que vende.<br />Más ángulos para probar.</h3>
          <p className="mt-4 leading-relaxed text-brand-mist/70">Lee lo que dijo el creador, encuentra el hook y estudia cómo demuestra el producto. Con Pro, genera variantes del inicio, la presentación y el cierre para probar más mensajes con tu propia voz.</p>
          <p className="mt-4 text-sm leading-relaxed text-brand-mist/55">Guion por segundos + análisis de la estructura. Adapta la referencia a tu experiencia y a tu producto.</p>
          <Button variant="brand" size="brand-lg" className="mt-7" onClick={() => onExplore('tour_scripts')}>Explorar videos y guiones <ArrowRight className="ml-1 size-4" /></Button>
        </div>
        <figure className="min-w-0">
          <Tabs defaultValue="guion">
            <TabsList aria-label="Capturas del guion y su análisis" className="mb-3 h-auto w-full justify-start gap-1 bg-white/5 p-1">
              <TabsTrigger value="guion" className="min-h-11 px-4 text-brand-mist/70 data-[state=active]:bg-brand-cyan data-[state=active]:text-brand-ink">Guion por segundos</TabsTrigger>
              <TabsTrigger value="analisis" className="min-h-11 px-4 text-brand-mist/70 data-[state=active]:bg-brand-cyan data-[state=active]:text-brand-ink">Hook y análisis</TabsTrigger>
            </TabsList>
            <TabsContent value="guion"><ProductCapture name="guion" alt="Guion real de un video de arcosbren, desglosado por segundos dentro de TokXray" width={1024} height={686} /></TabsContent>
            <TabsContent value="analisis"><ProductCapture name="analisis" alt="Análisis real de TokXray: primeras palabras, demostración del producto e invitación a actuar" width={1024} height={686} /></TabsContent>
          </Tabs>
          <figcaption className="mt-3 text-center text-xs text-brand-mist/55">Capturas reales · guiones, análisis y variantes con Pro</figcaption>
        </figure>
      </article>

      <article className="grid items-center gap-8 pt-12 md:grid-cols-2 md:gap-14 md:pt-16">
        <div className="md:order-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-cyan"><Wallet className="size-4" />03 · ELIGE DÓNDE COMPETIR</p>
          <h3 className="mt-4 font-display text-3xl font-bold text-balance md:text-4xl">Tu esfuerzo importa.<br />La comisión también.</h3>
          <p className="mt-4 leading-relaxed text-brand-mist/70">No todas las ventas dejan lo mismo. Cruza demanda, comisión por venta y presencia de creadores para detectar productos que vale la pena investigar antes de que más personas los promocionen.</p>
          <p className="mt-4 leading-relaxed text-brand-mist/70">Compara dos productos, escribe tu meta de comisiones y calcula cuántas ventas necesitarías con cada uno.</p>
          <p className="mt-4 text-sm text-brand-mist/55">La puntuación combina señales del reporte. El simulador calcula escenarios; no predice tus ventas.</p>
          <Button variant="brand" size="brand-lg" className="mt-7" onClick={() => onExplore('tour_opportunities')}>Encontrar una oportunidad <ArrowRight className="ml-1 size-4" /></Button>
        </div>
        <figure className="mx-auto w-full max-w-lg md:order-1">
          <ProductCapture name="oportunidades" alt="Comparador real de productos en TokXray con ventas, creadores, comisión por venta y una meta editable de 1000 pesos" width={672} height={714} />
          <figcaption className="mt-3 text-center text-xs text-brand-mist/55">Captura real de TokXray · comparador de oportunidades</figcaption>
        </figure>
      </article>
    </div>
  </section>;
}

export function CreatorScenarios({ onExplore }: TourProps) {
  const scenarios = [
    { title: 'Grabas seguido. Las comisiones no llegan.', body: 'Antes de dedicarle otro día al mismo producto, buscas uno con ventas, abres sus mejores videos y eliges una demostración concreta para probar.', decision: 'De grabar por inercia a elegir con datos.' },
    { title: 'Ya vendiste una vez. Quieres otro ángulo.', body: 'Estudias el guion de una referencia, identificas la duda que resuelve y pruebas otro inicio con tu experiencia real.', decision: 'De repetir lo mismo a probar un nuevo mensaje.' },
    { title: 'Dos productos. Comisiones muy distintas.', body: 'Comparas cuánto deja cada venta, cuántos creadores aparecen en el reporte y qué demanda existe antes de pedir tu siguiente muestra.', decision: 'De elegir por intuición a comparar la oportunidad.' },
  ];
  return <section aria-labelledby="scenarios-title" className="border-b border-brand-ink/10 bg-brand-mist">
    <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-14 md:py-20">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-pink">¿En cuál te reconoces?</p>
      <h2 id="scenarios-title" className="mt-3 max-w-2xl font-display text-3xl font-extrabold text-balance md:text-4xl">Tres decisiones que pueden cambiar tu siguiente video.</h2>
      <p className="mt-4 text-sm text-brand-ink/60">Situaciones ilustrativas. No son testimonios ni resultados de clientes.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {scenarios.map((scenario, i) => <article key={scenario.title} className="flex flex-col rounded-2xl border border-brand-ink/10 bg-white p-6">
          <p className="text-xs font-medium text-brand-ink/55">0{i + 1} · Escenario ilustrativo</p>
          <h3 className="mt-4 text-xl font-bold text-balance">{scenario.title}</h3>
          <p className="mb-6 mt-3 text-sm leading-relaxed text-brand-ink/65">{scenario.body}</p>
          <p className="mt-auto border-t border-brand-ink/10 pt-4 text-sm font-semibold">{scenario.decision}</p>
        </article>)}
      </div>
      <Button variant="brand" size="brand-lg" className="mt-8" onClick={() => onExplore('creator_scenarios')}>Ver qué está vendiendo <ArrowRight className="ml-1 size-4" /></Button>
    </div>
  </section>;
}
