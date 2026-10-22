import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatReportPeriod } from "@/lib/catalog-period";

interface SalesCaseVideo {
  creator_handle: string | null;
  creator_name: string | null;
  revenue_mxn: number | null;
  snapshot_date_range: string | null;
  product_name: string | null;
  title: string | null;
  product?: { commission: number | null } | null;
}

export function estimateCaseCommission(revenue: number | null | undefined, rate: number | null | undefined) {
  if (revenue == null || rate == null || !Number.isFinite(revenue) || !Number.isFinite(rate) || revenue < 0 || rate < 0 || rate > 100) return null;
  return revenue * (rate / 100);
}

const pesos = (value: number) => `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export function SalesCase({ video, onExplore }: { video?: SalesCaseVideo; onExplore: () => void }) {
  if (!video || video.revenue_mxn == null || !Number.isFinite(video.revenue_mxn) || video.revenue_mxn <= 0) return null;
  const commission = video.product?.commission;
  const estimated = estimateCaseCommission(video.revenue_mxn, commission);
  return <section aria-labelledby="sales-case-title" className="border-b border-white/10 bg-brand-ink text-brand-mist">
    <div className="mx-auto max-w-6xl px-[var(--page-pad-x)] py-12 md:py-16">
      <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">El caso que estás viendo arriba</p>
          <h2 id="sales-case-title" className="mt-3 font-display text-3xl font-extrabold text-balance md:text-4xl">Detrás de ese video hay una oportunidad que puedes estudiar.</h2>
          <p className="mt-4 leading-relaxed text-brand-mist/70">Las vistas te dicen que llamó la atención. Las ventas y la comisión te ayudan a entender por qué vale la pena abrir su guion y estudiar cómo presentó el producto.</p>
          <Button variant="brand-outline" size="brand-lg" className="mt-6" onClick={onExplore}>Explorar videos con ventas <ArrowRight className="ml-1 size-4" /></Button>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5 sm:p-7">
          <p className="text-sm font-semibold text-brand-mist">{video.product_name || video.title || 'Video del catálogo'}</p>
          <p className="mt-2 text-xs text-brand-mist/60">@{(video.creator_handle || video.creator_name || 'creador').replace(/^@/, '')}</p>
          <dl className="mt-6 grid grid-cols-2 gap-5">
            <div><dt className="text-xs text-brand-mist/65">Ventas reportadas</dt><dd className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">{pesos(video.revenue_mxn)} <span className="text-xs font-normal">MXN</span></dd></div>
            <div><dt className="text-xs text-brand-mist/65">Comisión del producto</dt><dd className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">{estimated == null ? 'Sin dato' : `${commission}%`}</dd></div>
            {estimated != null && <div className="col-span-2 border-t border-white/15 pt-5"><dt className="text-sm text-brand-cyan">Comisión estimada para este volumen de ventas</dt><dd className="mt-2 font-mono text-4xl font-bold tabular-nums text-brand-cyan sm:text-5xl">≈ {pesos(estimated)} <span className="text-base font-normal">MXN</span></dd><p className="mt-3 text-xs text-brand-mist/60">{pesos(video.revenue_mxn)} en ventas × {commission}% de comisión.</p></div>}
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-brand-mist/60">{video.snapshot_date_range ? formatReportPeriod(video.snapshot_date_range) : 'Consulta el período en el catálogo'}. {estimated != null ? 'Estimación con la comisión del producto; no es un pago confirmado al creador. No descuenta devoluciones ni ajustes.' : 'No hay una comisión disponible para calcular cuánto correspondería al creador.'}</p>
          <p className="mt-3 text-sm font-medium">Con Pro, estudia el guion y el análisis detrás de la referencia. Tus resultados dependerán de lo que pruebes.</p>
        </div>
      </div>
    </div>
  </section>;
}
