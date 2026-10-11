import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ApifyBatchImport() {
  const [runId, setRunId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<Record<string, string>>({});
  const stopped = useRef(false);
  useEffect(() => () => { stopped.current = true; }, []);
  const start = async () => {
    if (!/^[a-zA-Z0-9]{10,32}$/.test(runId.trim())) { setMessage('Copia el ID de ejecución de Apify, no la URL.'); return; }
    const id = runId.trim(), key = `tokxray-apify-offset-${id}`;
    let offset = Number(localStorage.getItem(key) || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) offset = 0;
    stopped.current = false; setBusy(true); setMessage('');
    try {
      while (!stopped.current) {
        const { data, error } = await supabase.functions.invoke('import-apify-batch', { body: { runId: id, offset } });
        if (error) {
          const detail = await error.context?.json?.().catch(() => null);
          throw new Error(detail?.error || 'No se pudo importar el lote. Puedes reanudarlo.');
        }
        if (stopped.current) return;
        if (!data || !Array.isArray(data.results) || !Number.isSafeInteger(data.nextOffset)) throw new Error('Respuesta incompleta; reanuda el lote.');
        setResults(previous => ({ ...previous, ...Object.fromEntries(data.results.map((r: any, i: number) => [r.id || `${offset}-${i}`, r.status])) }));
        setProgress(`${data.nextOffset} de ${data.total} registros revisados`);
        localStorage.setItem(key, String(data.nextOffset));
        if (data.retry) throw new Error('Algunos archivos no se pudieron transferir. Pulsa reanudar para intentar la misma página sin duplicar videos.');
        offset = data.nextOffset;
        if (data.complete) { setMessage('Lote terminado. Los MP4 válidos ya están publicados en sus productos y creadores.'); break; }
      }
    } catch (error: any) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const counts = (status: string) => Object.values(results).filter(value => value === status).length;
  return <Card className="p-5 space-y-3">
    <h2 className="text-lg font-semibold">Publicar un lote de videos de Apify</h2>
    <p className="text-sm text-muted-foreground">Primero importa el reporte de datos en Excel. Después ejecuta TikTok Video Scraper en Apify con los enlaces y la descarga MP4 activada. Pega aquí el ID de la ejecución terminada: copiaremos los archivos al catálogo sin modificar sus ventas ni asociaciones.</p>
    <div className="flex flex-wrap gap-2">
      <Input aria-label="ID de ejecución de Apify" placeholder="ID de ejecución de Apify" value={runId} disabled={busy} onChange={event => { setRunId(event.target.value); setResults({}); setProgress(''); setMessage(''); }} className="max-w-sm" />
      <Button disabled={busy || !runId.trim()} onClick={start}>{busy ? 'Importando…' : 'Importar / reanudar lote'}</Button>
      {busy && <Button variant="outline" onClick={() => { stopped.current = true; setMessage('Pausado. Puedes reanudar el lote.'); }}>Pausar</Button>}
    </div>
    <p className="text-xs text-muted-foreground">No inicia ejecuciones ni analiza con IA. Admite MP4 de hasta 19 MB. Los privados, eliminados o sin archivo se omiten. La importación se puede reanudar.</p>
    {progress && <p role="status">{progress} · Nuevos: {counts('imported')} · Ya disponibles: {counts('already_available')} · No disponibles: {counts('unavailable')} · Sin ficha en el catálogo: {counts('missing_catalog')}</p>}
    {message && <p className="text-sm" role="status">{message}</p>}
  </Card>;
}
