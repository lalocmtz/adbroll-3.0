import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const count = z.number().int().nonnegative();
const statusSchema = z.object({
  settings: z.object({ enabled: z.boolean(), daily_attempt_limit: count, max_concurrent: count }),
  // PostgreSQL aggregate results are null when the queue has no entries.
  counts: z.object({ pending: count.default(0), dispatched: count.default(0), running: count.default(0), ready: count.default(0), failed: count.default(0) }).nullable().transform(value => value ?? { pending: 0, dispatched: 0, running: 0, ready: 0, failed: 0 }),
  attemptsToday: count,
  estimatedCostUsd: z.number().nonnegative(),
  failures: z.array(z.object({ video_id: z.string(), title: z.string().nullable(), attempts: count, last_error_code: z.string().nullable(), updated_at: z.string() })).nullable().transform(value => value ?? []),
});
type ProcessingStatus = z.infer<typeof statusSchema>;
function failureDescription(code: string | null) {
  if (code === 'WORKER_TIMEOUT') return 'La preparación superó el tiempo disponible.';
  if (code === 'NETWORK_ERROR') return 'Se interrumpió la conexión durante la preparación.';
  if (code?.includes('429')) return 'Se alcanzó temporalmente el límite del servicio de análisis.';
  if (code?.includes('401') || code?.includes('403')) return 'El servicio no pudo autorizar el análisis. Requiere revisión de configuración.';
  if (code === 'PROCESS_409') return 'El archivo cambió durante la preparación.';
  if (code === 'PROCESS_422' || code === 'PROCESS_400') return 'El archivo o el contenido no pudieron procesarse.';
  if (code?.includes('503') || code?.includes('502')) return 'El servicio de análisis no estuvo disponible.';
  return 'No se pudo completar este guion. Requiere revisión.';
}
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);

/** Read-only founder view; the RPC separately enforces founder authorization. */
export function AdminCatalogProcessing() {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const request = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const current = ++request.current;
    busy.current = true;
    setLoading(true); setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_catalog_processing_status' as never);
      if (current !== request.current) return;
      if (rpcError) throw rpcError;
      const parsed = statusSchema.safeParse(data);
      if (!parsed.success) throw new Error('Invalid processing status');
      setStatus(parsed.data); setLoadedAt(new Date());
    } catch {
      if (current === request.current) setError('No pudimos consultar la preparación de guiones. Revisa tu sesión de administrador y vuelve a intentar.');
    } finally {
      if (current === request.current) { busy.current = false; setLoading(false); }
    }
  }, []);
  useEffect(() => { busy.current = false; void refresh(); return () => { request.current++; }; }, [refresh]);
  return <Card className="space-y-4 p-4 sm:p-5" aria-label="Preparación de guiones del catálogo">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-balance text-lg font-semibold">Preparación de guiones</h2><p className="mt-1 text-pretty text-sm text-muted-foreground">Estado del trabajo previo a la consulta de los usuarios. Panel de solo lectura.</p></div><Button variant="outline" className="h-11" disabled={loading} onClick={() => void refresh()}><RefreshCw className="mr-2 size-4" />{loading ? 'Actualizando…' : 'Actualizar estado'}</Button></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}{status ? ' Los datos de abajo corresponden a la última consulta correcta.' : ''}</p>}
    {loading && !status && <p role="status" className="text-sm text-muted-foreground">Consultando cola de preparación…</p>}
    {status && <>
      <p className="text-sm font-medium">{status.settings.enabled ? 'Preparación automática activa' : 'Preparación automática pausada'}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[
        ['Listos', status.counts.ready], ['En espera', status.counts.pending], ['Asignados', status.counts.dispatched], ['En preparación', status.counts.running], ['Fallidos', status.counts.failed],
      ].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl>
      <div className="grid gap-3 text-sm sm:grid-cols-3"><p>Intentos de hoy (UTC): <strong className="tabular-nums">{status.attemptsToday} / {status.settings.daily_attempt_limit}</strong></p><p>Procesos simultáneos permitidos: <strong className="tabular-nums">{status.settings.max_concurrent}</strong></p><p>Costo estimado acumulado: <strong className="tabular-nums">{money(status.estimatedCostUsd)} USD</strong></p></div>
      <p className="text-xs text-muted-foreground">El costo es una estimación operativa del catálogo, no una factura. Los intentos pueden incluir reintentos del mismo video.</p>
      <div className="space-y-2"><h3 className="text-sm font-semibold">Fallos recientes</h3>{status.failures.length ? <ul className="space-y-2">{status.failures.map(failure => <li key={failure.video_id} className="rounded-xl border p-3"><p className="line-clamp-2 text-sm font-medium">{failure.title || 'Video sin título'}</p><p className="mt-1 text-pretty text-sm text-muted-foreground">{failureDescription(failure.last_error_code)}</p><p className="mt-2 text-xs text-muted-foreground"><span className="tabular-nums">{failure.attempts}</span> intentos · {new Date(failure.updated_at).toLocaleString('es-MX')}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No hay fallos registrados en esta consulta.</p>}</div>
      {loadedAt && <p className="text-xs text-muted-foreground">Última consulta correcta: {loadedAt.toLocaleTimeString('es-MX')}</p>}
    </>}
  </Card>;
}
