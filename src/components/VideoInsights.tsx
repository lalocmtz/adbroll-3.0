import { ArrowRight, Eye, Lightbulb, Target, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ScriptSegment { start_ms: number; end_ms: number; text: string }
export function validScriptSegments(value: unknown, durationSeconds?: number): ScriptSegment[] {
  if (!Array.isArray(value)) return [];
  const milliseconds = (start: unknown, end: unknown, multiplier: number) => {
    if (typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end) ||
      start < 0 || end <= start || end > Number.MAX_SAFE_INTEGER / multiplier) return null;
    const start_ms = Math.round(start * multiplier);
    const end_ms = Math.round(end * multiplier);
    return end_ms > start_ms ? { start_ms, end_ms } : null;
  };
  const segments = value.flatMap((segment): ScriptSegment[] => {
    if (!segment || typeof segment !== 'object' || typeof segment.text !== 'string' || !segment.text.trim()) return [];
    // Current stored analyses use seconds; older transcripts use milliseconds.
    // Validate each pair together, never combine different units or coerce strings.
    const time = milliseconds(segment.start_seconds, segment.end_seconds, 1000)
      ?? milliseconds(segment.start_ms, segment.end_ms, 1);
    return time ? [{ ...time, text: segment.text }] : [];
  }).sort((a, b) => a.start_ms - b.start_ms);
  // Duration comes from the actual media element, never model output. One
  // impossible timestamp makes this timeline unreliable; keep untimed text.
  if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0 &&
    segments.some(segment => segment.end_ms > durationSeconds * 1000)) return [];
  return segments;
}
const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
const range = (segment: ScriptSegment) => `${clock(segment.start_ms)}–${clock(segment.end_ms)}`;
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];

/** Only source timestamps are displayed. Legacy transcripts remain untimed. */
export function ScriptTranscript({ transcript, segments, durationSeconds, locale = 'es' }: { transcript: string; segments?: unknown; durationSeconds?: number; locale?: 'es' | 'en' }) {
  const timed = validScriptSegments(segments, durationSeconds);
  if (!timed.length) return <p className="whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed [overflow-wrap:anywhere]">{transcript}</p>;
  const normalizedText = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();
  const coversTranscript = normalizedText(timed.map(segment => segment.text).join(' ')) === normalizedText(transcript);
  return <><ol aria-label={locale === 'es' ? 'Guion por segundos' : 'Script by seconds'} className="space-y-2">
    {timed.map((segment, index) => <li key={`${segment.start_ms}-${index}`} className="flex min-w-0 gap-3 rounded-xl border border-border/60 p-3">
      <span className="shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums text-brand-ink-700">{range(segment)}</span>
      <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{segment.text}</p>
    </li>)}
  </ol>
    {!coversTranscript && transcript.trim() && <details className="mt-3 rounded-xl border border-border/60 px-4">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">{locale === 'es' ? 'Guion original completo' : 'Complete original script'}</summary>
      <p className="whitespace-pre-wrap break-words pb-4 text-sm leading-relaxed [overflow-wrap:anywhere]">{transcript}</p>
    </details>}
  </>;
}

/** Presentation only: saved evidence, no requests, scores or inferred timecodes. */
export function VideoInsights({ analysis, segments, durationSeconds, locale = 'es', onExploreVariants }: {
  analysis: Record<string, unknown>;
  segments?: unknown;
  durationSeconds?: number;
  locale?: 'es' | 'en';
  onExploreVariants?: () => void;
}) {
  const es = locale === 'es';
  const t = (spanish: string, english: string) => es ? spanish : english;
  const hook = text(analysis.hook);
  const body = text(analysis.body);
  const cta = text(analysis.cta);
  const visuals = list(analysis.visual_observations);
  const takeaways = list(analysis.beginner_takeaways);
  const first = validScriptSegments(segments ?? analysis.segments, durationSeconds)[0];
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border border-brand-pink-200 bg-brand-pink-50 text-brand-ink">
      <div className="flex items-center gap-2 border-b border-brand-pink-200 px-4 py-3 text-brand-pink-700"><Target className="size-4" aria-hidden="true" /><h3 className="text-sm font-semibold">{t('El gancho · primeros segundos', 'The hook · opening seconds')}</h3></div>
      <div className="space-y-3 p-4">
        {first && <blockquote className="border-l-2 border-brand-pink pl-3"><span className="mb-1 block text-xs font-semibold tabular-nums text-brand-pink-700">{range(first)} · {t('Primera frase transcrita', 'First transcribed phrase')}</span><p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed">“{first.text}”</p></blockquote>}
        {hook ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{hook}</p> : <p className="text-sm text-muted-foreground">{t('El análisis del inicio aún no está disponible.', 'The opening analysis is not available yet.')}</p>}
      </div>
    </section>

    {(body || cta) && <section aria-label={t('Mapa del guion', 'Script map')}>
      <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t('Mapa del guion', 'Script map')}</h3><span className="text-xs text-muted-foreground">{t('Inicio → producto → acción', 'Opening → product → action')}</span></div>
      <ol className="space-y-3 border-l border-brand-cyan-200 pl-4">
        {[{ value: body, number: '02', title: t('Cómo presenta el producto', 'How it presents the product') }, { value: cta, number: '03', title: t('Invitación a actuar', 'Call to action') }].filter(item => item.value).map(item => <li key={item.number} className="rounded-xl border border-border/60 bg-muted/20 p-3"><h4 className="flex items-center gap-2 text-sm font-medium"><span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-cyan-100 text-xs tabular-nums text-brand-ink-700">{item.number}</span>{item.title}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{item.value}</p></li>)}
      </ol>
    </section>}

    {visuals.length > 0 && <section className="rounded-xl border p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Eye className="size-4 text-brand-cyan-700" aria-hidden="true" />{t('Qué se ve en el video', 'What is visible in the video')}</h3><ul className="space-y-2">{visuals.map((item, index) => <li key={index} className="flex gap-2 text-sm leading-relaxed"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-cyan-600" aria-hidden="true" /><span>{item}</span></li>)}</ul></section>}

    {takeaways.length > 0 && <section className="rounded-2xl border border-brand-cyan-200 bg-brand-cyan-50 p-4 text-brand-ink"><h3 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-brand-cyan-700" aria-hidden="true" />{t('Por qué puede funcionar', 'Why it may work')}</h3><p className="mt-1 text-xs leading-relaxed text-brand-ink-600">{t('Llévalo a tu producto y prueba con tu audiencia.', 'Adapt it to your product and test it with your audience.')}</p><ol className="mt-3 space-y-3">{takeaways.map((item, index) => <li key={index} className="flex gap-2.5 text-sm leading-relaxed"><span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold tabular-nums text-brand-ink-700">{index + 1}</span><span>{item}</span></li>)}</ol></section>}

    {onExploreVariants && <Button variant="outline" className="min-h-11 w-full gap-2 border-brand-pink-200 text-brand-pink-700 hover:bg-brand-pink-50" onClick={onExploreVariants}><Wand2 className="size-4" />{t('Probar otros hooks y guiones', 'Try other hooks and scripts')}<ArrowRight className="ml-auto size-4" /></Button>}
  </div>;
}
