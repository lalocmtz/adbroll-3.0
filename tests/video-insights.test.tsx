import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptTranscript, VideoInsights, validScriptSegments } from '@/components/VideoInsights';

describe('saved video insights', () => {
  it('shows legacy analysis without inventing timestamps, observations or causal claims', () => {
    render(<VideoInsights analysis={{ hook: 'Abre con una pregunta', body: null, cta: null, uncertainties: ['No mostrar esta sección'] }} />);
    expect(screen.getByText('Abre con una pregunta')).toBeVisible();
    expect(screen.queryByText(/0:00/)).not.toBeInTheDocument();
    expect(screen.queryByText('Qué se ve en el video')).not.toBeInTheDocument();
    expect(screen.queryByText('Por qué puede funcionar')).not.toBeInTheDocument();
    expect(screen.queryByText('No mostrar esta sección')).not.toBeInTheDocument();
    expect(screen.queryByText('Qué falta comprobar')).not.toBeInTheDocument();
  });
  it('separates the actual timed phrase, script map, observations and ideas to test', () => {
    render(<VideoInsights analysis={{ hook: 'Presenta el problema', body: 'Demuestra el producto', cta: 'Invita a visitar la tienda', visual_observations: ['Muestra el empaque', null, 4], beginner_takeaways: ['Prueba una demostración corta'], uncertainties: ['No sabemos el presupuesto'], segments: [{ start_seconds: 2, end_seconds: 5.5, text: 'Mira este producto' }] }} />);
    expect(screen.getByText('0:02–0:05 · Primera frase transcrita')).toBeVisible();
    expect(screen.getByText('“Mira este producto”')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Mapa del guion' })).toHaveTextContent('Demuestra el producto');
    expect(screen.getByText('Muestra el empaque')).toBeVisible();
    expect(screen.getByText('Prueba una demostración corta')).toBeVisible();
    expect(screen.getByText('Llévalo a tu producto y prueba con tu audiencia.')).toBeVisible();
    expect(screen.queryByText('No sabemos el presupuesto')).not.toBeInTheDocument();
  });
  it('opens variant controls only after a user action, without generating on render', () => {
    const open = vi.fn();
    render(<VideoInsights analysis={{ hook: 'Un inicio' }} onExploreVariants={open} />);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Probar otros hooks y guiones' }));
    expect(open).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed timestamps and sorts without mutating the saved array', () => {
    const valid = [{ start_ms: 5000, end_ms: 8000, text: 'Cierre' }, { start_ms: 0, end_ms: 2000, text: 'Inicio' }];
    expect(validScriptSegments([...valid, null, { start_ms: -5, end_ms: 100, text: 'No' }, { start_ms: 50, end_ms: 0, text: 'No' }, { start_ms: 0, end_ms: 100, text: null }]).map(s => s.text)).toEqual(['Inicio', 'Cierre']);
    expect(valid[0].text).toBe('Cierre');
  });
  it('keeps the original transcript readable when there are no real segments', () => {
    render(<ScriptTranscript transcript="Texto original completo" segments={null} />);
    expect(screen.getByText('Texto original completo')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it('renders source segments in an accessible timeline', () => {
    render(<ScriptTranscript transcript="Inicio" segments={[{ start_ms: 0, end_ms: 4000, text: 'Inicio' }]} />);
    expect(screen.getByRole('list', { name: 'Guion por segundos' })).toHaveTextContent('0:00–0:04');
    expect(screen.getByText('Inicio')).toBeVisible();
  });
  it('normalizes actual stored seconds and legacy milliseconds without mixing units', () => {
    const source = [
      { start_seconds: 0.25, end_seconds: 3.125, text: 'Actual' },
      { start_ms: 4000, end_ms: 6000, text: 'Legacy' },
      { start_seconds: 7, end_ms: 9000, text: 'Invalid mixed units' },
    ];
    expect(validScriptSegments(source)).toEqual([
      { start_ms: 250, end_ms: 3125, text: 'Actual' },
      { start_ms: 4000, end_ms: 6000, text: 'Legacy' },
    ]);
    expect(source[0]).toEqual({ start_seconds: 0.25, end_seconds: 3.125, text: 'Actual' });
  });
  it('rejects nonfinite, unsafe, negative, reversed and zero-length seconds', () => {
    expect(validScriptSegments([
      { start_seconds: NaN, end_seconds: 3, text: 'Invalid' },
      { start_seconds: 0, end_seconds: Infinity, text: 'Invalid' },
      { start_seconds: 0, end_seconds: Number.MAX_VALUE, text: 'Invalid' },
      { start_seconds: -1, end_seconds: 3, text: 'Invalid' },
      { start_seconds: 3, end_seconds: 2, text: 'Invalid' },
      { start_seconds: 2, end_seconds: 2, text: 'Invalid' },
      { start_seconds: '0', end_seconds: 3, text: 'Invalid' },
      { start_seconds: 0, end_seconds: 0.0001, text: 'Invalid' },
    ])).toEqual([]);
  });
  it('renders actual stored seconds and retains full text when segments are partial', () => {
    const { container } = render(<ScriptTranscript transcript="Inicio y cierre completos" segments={[{ start_seconds: 0, end_seconds: 4, text: 'Inicio' }]} />);
    expect(screen.getByRole('list', { name: 'Guion por segundos' })).toHaveTextContent('0:00–0:04');
    const full = screen.getByText('Inicio y cierre completos');
    expect(full).toBeInTheDocument();
    container.querySelector('details')!.open = true;
    expect(full).toBeVisible();
  });
  it('does not duplicate the full text when timestamped segments cover the transcript', () => {
    render(<ScriptTranscript transcript="Inicio   y cierre" segments={[{ start_seconds: 0, end_seconds: 4, text: 'Inicio' }, { start_seconds: 4, end_seconds: 8, text: 'y cierre' }]} />);
    expect(screen.queryByText('Guion original completo')).not.toBeInTheDocument();
  });

  it('drops impossible model timecodes beyond the measured85second file without altering text', () => {
    const segments = [{ start_seconds: 0, end_seconds: 5, text: 'Inicio' }, { start_seconds: 66, end_seconds: 121, text: 'Cierre' }];
    expect(validScriptSegments(segments, 85.166667)).toEqual([]);
    render(<ScriptTranscript transcript="Inicio y cierre completos" segments={segments} durationSeconds={85.166667} />);
    expect(screen.getByText('Inicio y cierre completos')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/2:01/)).not.toBeInTheDocument();
    expect(segments[1].end_seconds).toBe(121);
  });
  it('keeps times within the media duration and uses no invented bounds when duration is unavailable', () => {
    const segments = [{ start_ms: 0, end_ms: 85166, text: 'Todo' }];
    expect(validScriptSegments(segments, 85.166667)).toEqual(segments);
    expect(validScriptSegments(segments)).toEqual(segments);
    expect(validScriptSegments(segments, Infinity)).toEqual(segments);
    expect(validScriptSegments(segments, 0)).toEqual(segments);
  });
  it('omits unreliable hook timestamps while retaining saved analysis', () => {
    render(<VideoInsights analysis={{ hook: 'Abre con una pregunta', segments: [{ start_seconds: 66, end_seconds: 121, text: 'Fuera del archivo' }] }} durationSeconds={85.166667} />);
    expect(screen.getByText('Abre con una pregunta')).toBeVisible();
    expect(screen.queryByText(/Primera frase transcrita/)).not.toBeInTheDocument();
  });

});
