import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const n = z.number().nonnegative();
const schema = z.object({
  asOf: z.string(),
  storage: z.object({ databaseBytes: n, fileBytes: n, unknownSizes: n, buckets: z.array(z.object({ id: z.string(), objects: n, bytes: n, unknown_sizes: n })) }),
  users: z.object({ registered: n, email_confirmed: n, paid_active: n, complimentary_active: n, affiliate_codes: n, active_affiliates: n }),
  ai: z.object({ balanceUsd: z.null(), unmeteredAnalyses: n, models: z.array(z.object({ model: z.string(), analyses: n, metered_analyses: n, input_tokens: n, output_tokens: n, estimated_usd: n.nullable() })) }),
  providerUsage: z.object({ since: z.string(), latestAt: z.string().nullable(), attempts: n, failed: n, unpricedAttempts: n, estimatedUsd: n.nullable(), models: z.array(z.object({ model: z.string(), attempts: n, succeeded: n, failed: n, unpriced_attempts: n, input_tokens: n, output_tokens: n, estimated_usd: n.nullable() })) }).optional(),
  queue: z.object({ remaining: n, failed: n, retrying: n, completed_last_hour: n, expired_leases: n }),
  downloads: z.object({ failed: n, unknown: n, rejected: n, billingBlocked: n, latestFailureAt: z.string().nullable() }),
  settings: z.object({ enabled: z.boolean(), dailyLimit: n, concurrency: n }), attemptsToday: n,
});
type Snapshot = z.infer<typeof schema>;
const num = (v: number) => v.toLocaleString('es-MX');
const usd = (v: number) => `US$${v.toFixed(4)}`;
const bytes = (v: number) => v >= 1e9 ? `${(v / 1e9).toFixed(2)} GB` : `${(v / 1e6).toFixed(2)} MB`;
const External = ({ href, children }: { href: string; children: React.ReactNode }) => <a className="text-sm text-primary underline underline-offset-4" href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export function AdminOperationsOverview() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const id = ++generation.current;
    setLoading(true); setError(false);
    try {
      const response = await supabase.rpc('get_operations_overview' as never);
      if (response.error) throw response.error;
      const value = schema.parse(response.data);
      if (id === generation.current) setData(value);
    } catch { if (id === generation.current) setError(true); }
    finally { if (id === generation.current) { busy.current = false; setLoading(false); } }
  }, []);
  useEffect(() => { busy.current = false; void refresh(); return () => { generation.current++; }; }, [refresh]);
  const q = data?.queue;
  const alerts: string[] = [];
  if (data) {
    if (data.downloads.billingBlocked) alerts.push('Hay descargas bloqueadas por saldo o cuota del proveedor. Revisa la facturación de Apify antes de reintentarlas.');
    if (data.downloads.unknown) alerts.push(`${num(data.downloads.unknown)} descargas tienen inicio sin confirmar; requieren revisión para evitar duplicar cargos.`);
    if (data.downloads.failed + data.downloads.rejected) alerts.push(`${num(data.downloads.failed + data.downloads.rejected)} descargas fallidas o rechazadas requieren revisión.`);
    if (!data.settings.enabled && data.queue.remaining) alerts.push('La preparación automática está pausada y hay videos pendientes.');
    if (data.attemptsToday >= data.settings.dailyLimit && data.queue.remaining) alerts.push('Se alcanzó el límite diario de preparación. Los intentos se reanudan al cambiar el día UTC si la cola está activa.');
    if (data.queue.failed) alerts.push(`${num(data.queue.failed)} videos requieren revisión después de agotar sus intentos.`);
    if (data.queue.retrying) alerts.push(`${num(data.queue.retrying)} videos esperan un reintento automático.`);
    if (data.queue.expired_leases) alerts.push('Hay procesos que superaron su tiempo; el siguiente ciclo de la cola revisará su estado.');
    if (data.storage.unknownSizes) alerts.push(`${num(data.storage.unknownSizes)} archivos no tienen tamaño registrado y no están incluidos en el total.`);
    if (data.queue.remaining && !data.queue.completed_last_hour && data.settings.enabled) alerts.push('No hay preparaciones completadas en los últimos 60 minutos; revisa la cola y sus límites.');
  }
  const estimates = data?.ai.models.filter(m => m.estimated_usd !== null) ?? [];
  return <section className="space-y-5" aria-label="Resumen operativo del fundador">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Control de TokXray</h2><p className="mt-1 text-sm text-muted-foreground">Datos operativos de esta plataforma. Solo visibles para el fundador.</p></div><Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw className="mr-2 size-4" />Actualizar resumen</Button></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">No se pudo consultar el resumen. Revisa tu sesión de fundador e intenta de nuevo.{data ? ' Los datos conservados son de la última consulta correcta.' : ''}</p>}
    {loading && !data && <p role="status">Consultando operación…</p>}
    {data && <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['Suscriptores de pago activos', num(data.users.paid_active)], ['Accesos gratuitos activos', num(data.users.complimentary_active)],
        ['Usuarios registrados', num(data.users.registered)], ['Afiliados con referidos de pago', num(data.users.active_affiliates)],
      ].map(([label, value]) => <Card key={label} className="p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd></Card>)}</dl>
      <p className="text-xs text-muted-foreground">Usuarios únicos con acceso vigente según los registros de suscripción sincronizados. Los accesos gratuitos incluyen al fundador y creadores invitados.</p>
      <Card className="space-y-3 p-5"><h3 className="font-semibold">Avisos importantes</h3>{alerts.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{alerts.map(a => <li key={a}>{a}</li>)}</ul> : <p className="text-sm text-muted-foreground">No hay incidencias registradas en la cola en esta consulta.</p>}<p className="text-sm">Saldo de Gemini no conectado. No podemos detectar aquí si se agotaron los créditos del proveedor.</p><External href="https://console.apify.com/billing">Revisar plan, saldo y límites de Apify</External>{data.downloads.latestFailureAt && <p className="text-xs text-muted-foreground">Última incidencia de descarga: {new Date(data.downloads.latestFailureAt).toLocaleString('es-MX')}</p>}</Card>
      <Card className="space-y-3 p-5"><h3 className="font-semibold">Gemini · registro de llamadas</h3>{data.providerUsage ? <>
        <p className="text-sm">Registro habilitado desde {new Date(data.providerUsage.since).toLocaleString('es-MX')}. Incluye análisis, variantes, traducciones y reintentos que pasen por el servicio instrumentado.</p>
        <p className="text-2xl font-semibold tabular-nums">{data.providerUsage.estimatedUsd === null ? 'Sin costo medido disponible' : usd(data.providerUsage.estimatedUsd)}</p>
        <p className="text-sm">{num(data.providerUsage.attempts)} intentos registrados · {num(data.providerUsage.failed)} respuestas fallidas o inválidas · {num(data.providerUsage.unpricedAttempts)} intentos sin costo calculable.</p>
        {data.providerUsage.models.map(m => <div key={m.model} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="break-words font-medium">{m.model}</p><p>{num(m.attempts)} intentos · {num(m.input_tokens)} tokens de entrada · {num(m.output_tokens)} tokens de salida, incluido razonamiento</p><p>{m.estimated_usd === null ? 'Costo no calculable' : `${usd(m.estimated_usd)} estimados con tokens registrados`}</p></div>)}
        <p className="text-xs text-muted-foreground">Cada intento se registra por separado y conserva su estimación de tarifa. Un fallo sin tokens tiene costo desconocido, no cero. No incluye llamadas anteriores a la activación ni escrituras de registro que hayan fallado. No es una factura ni un saldo y no se suma al histórico de abajo.</p>
        {data.providerUsage.latestAt && <p className="text-xs text-muted-foreground">Último registro recibido: {new Date(data.providerUsage.latestAt).toLocaleString('es-MX')}</p>}
      </> : <p className="text-sm text-muted-foreground">El registro de llamadas aún no está conectado.</p>}</Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="space-y-3 p-5"><h3 className="font-semibold">Almacenamiento real</h3><p className="text-2xl font-semibold tabular-nums">{bytes(data.storage.fileBytes)} <span className="text-sm font-normal">en archivos</span></p><p className="text-sm">Base de datos: {bytes(data.storage.databaseBytes)}</p><ul className="space-y-2 text-sm">{data.storage.buckets.map(b => <li key={b.id} className="flex flex-wrap justify-between gap-2"><span>{b.id} · {num(b.objects)} archivos</span><span className="tabular-nums">{bytes(b.bytes)}</span></li>)}</ul><p className="text-xs text-muted-foreground">Tamaños registrados en Storage y tamaño de la base de datos. No incluye transferencia, copias de seguridad ni consumo de otros proyectos. La cuota restante del plan no está conectada.</p><External href="https://supabase.com/dashboard/project/tnqvvfpzkjwgllwdwvte">Ver uso y facturación en Supabase</External></Card>
        <Card className="space-y-3 p-5"><h3 className="font-semibold">Histórico · análisis base conservados</h3><p className="text-2xl font-semibold tabular-nums">{estimates.length ? usd(estimates.reduce((s, m) => s + (m.estimated_usd ?? 0), 0)) : 'Sin estimación disponible'}</p><p className="text-sm">Estimación de los análisis base conservados que tienen tokens y una tarifa conocida. No es el gasto total ni la factura de la cuenta.</p>{data.ai.models.map(m => <div key={m.model} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="break-words font-medium">{m.model}</p><p>{num(m.metered_analyses)} / {num(m.analyses)} análisis con medición</p><p>{num(m.input_tokens)} tokens de entrada · {num(m.output_tokens)} de salida</p><p>{m.estimated_usd === null ? 'Costo no estimado para este grupo' : `${usd(m.estimated_usd)} estimados`}</p></div>)}<p className="text-xs text-muted-foreground">{num(data.ai.unmeteredAnalyses)} análisis sin medición completa. Excluye variantes, fallos, reintentos y análisis reemplazados. Tarifa de referencia para gemini-3.5-flash-lite: US$0.30 / millón de tokens de entrada y US$2.50 de salida, incluido razonamiento; referencia 16/oct/2026.</p><p className="font-medium">Saldo no conectado</p><External href="https://aistudio.google.com/usage">Consultar saldo, créditos y facturación en Google AI Studio</External></Card>
      </div>
      <Card className="space-y-3 p-5"><h3 className="font-semibold">Avance y tiempo de preparación</h3><p className="text-sm">{num(q!.remaining)} pendientes · {num(q!.completed_last_hour)} completados en los últimos 60 minutos.</p><p className="text-sm">{!q!.remaining ? 'No quedan videos en la cola activa.' : !data.settings.enabled ? 'Sin estimación mientras la preparación esté pausada.' : q!.completed_last_hour >= 3 ? `Al ritmo observado: aproximadamente ${(q!.remaining / q!.completed_last_hour).toFixed(1)} horas de procesamiento activo.` : 'Aún no hay suficientes completados recientes para estimar un tiempo.'}</p><p className="text-sm">Intentos de hoy (UTC): {num(data.attemptsToday)} / {num(data.settings.dailyLimit)} · Hasta {num(data.settings.concurrency)} procesos simultáneos.</p><p className="text-xs text-muted-foreground">La proyección usa el último período de 60 minutos; no garantiza una hora de entrega. El límite diario, las pausas y los reintentos pueden extenderla a más días.</p></Card>
      <p className="text-xs text-muted-foreground">Última consulta correcta: {new Date(data.asOf).toLocaleString('es-MX')}. Usa Actualizar resumen para obtener nuevos datos.</p>
    </>}
  </section>;
}
