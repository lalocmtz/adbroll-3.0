import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import VideoAnalysisModalOriginal from '@/components/VideoAnalysisModalOriginal';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), toast: vi.fn(), hasPaid: true, openPaywall: vi.fn(), close: vi.fn() }));
vi.mock('@/contexts/BlurGateContext', () => ({ useBlurGateContext: () => ({ hasPaid: mocks.hasPaid, openPaywall: mocks.openPaywall }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, functions: { invoke: mocks.invoke },
  auth: { getUser: async () => ({ data: { user: null } }) },
} }));
const video = { id: 'video-a', video_url: 'https://www.tiktok.com/@creator/video/1234567890123456789', video_mp4_url: 'https://storage.example/video.mp4', title: 'Video de prueba' };
const transcript = 'Guion real recuperado.';
const analysis = { hook: 'Inicio', body: 'Demostración', cta: 'Conoce el producto' };
const view = (v = video, isOpen = true) => <MemoryRouter><VideoAnalysisModalOriginal video={v} isOpen={isOpen} onClose={mocks.close} /></MemoryRouter>;
async function open(v = video) { let component!: ReturnType<typeof render>; await act(async () => { component = render(view(v)); }); return component; }
async function tab(name: string) { await act(async () => { fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false }); }); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.hasPaid = true;
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript: null }] : null, error: null }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => { vi.restoreAllMocks(); });
describe('prepared catalog references', () => {
  it('opens one responsive player without autoplay or background generation', async () => {
    await open();
    const players = document.querySelectorAll('video');
    expect(players).toHaveLength(1);
    expect(players[0]).toHaveAttribute('preload', 'metadata');
    expect(players[0]).toHaveAttribute('controls');
    expect(players[0]).toHaveAttribute('src', `${video.video_mp4_url}#t=0.1`);
    expect(players[0]).toHaveClass('aspect-[9/16]', 'h-[40dvh]');
    expect(players[0]).not.toHaveAttribute('autoplay');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.getByText('Guion en preparación')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Generar transcripción' })).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('shows saved script and analysis even without previously generated variants', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript, variants_json: null }] : analysis, error: null }));
    await open();
    expect(screen.getByText(transcript)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Traducir al inglés' })).toBeVisible();
    await tab('Análisis');
    expect(screen.getByText('Demostración')).toBeVisible();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('shows RPC failures and retries only the saved data retrieval', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await open();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el guion guardado');
    mocks.rpc.mockResolvedValueOnce({ data: [{ locked: false, transcript }], error: null });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' })); });
    expect(screen.getByText(transcript)).toBeVisible();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('does not show a previous video response after switching videos', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.rpc.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const component = await open();
    await act(async () => { component.rerender(view({ ...video, id: 'video-b' })); });
    await act(async () => { resolveOld({ data: [{ locked: false, transcript: 'Guion anterior' }], error: null }); });
    expect(screen.queryByText('Guion anterior')).not.toBeInTheDocument();
  });
  it('generates variants only after explicit action and preserves the original', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript }] : analysis, error: null }));
    mocks.invoke.mockResolvedValue({ data: { variants: [{ hook: 'Nuevo inicio', body: 'Nuevo cuerpo', cta: 'Nuevo cierre' }] }, error: null });
    await open(); await tab('Variantes');
    expect(mocks.invoke).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Generar variantes' })); });
    expect(mocks.invoke).toHaveBeenCalledWith('generate-script-variants', expect.objectContaining({ body: expect.objectContaining({ transcript, variantCount: 2 }) }));
    expect(screen.getByText('Nuevo inicio')).toBeVisible();
    await tab('Guion'); expect(screen.getByText(transcript)).toBeVisible();
  });
  it('retains free access gates and never exposes translation to non-Pro users', async () => {
    mocks.hasPaid = false;
    mocks.rpc.mockResolvedValue({ data: [{ locked: true }], error: null });
    await open();
    expect(screen.getByRole('button', { name: 'Desbloquear guion y análisis' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Traducir al inglés' })).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalledWith('get_video_analysis', expect.anything());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('pauses playback on closing, changing source and unmount', async () => {
    const component = await open();
    const element = document.querySelector('video')!;
    const pause = vi.spyOn(element, 'pause');
    await act(async () => { component.rerender(view({ ...video, video_mp4_url: 'https://storage.example/other.mp4' })); });
    expect(pause).toHaveBeenCalled(); pause.mockClear();
    await act(async () => { component.rerender(view(video, false)); });
    expect(pause).toHaveBeenCalled();
    await act(async () => { component.rerender(view()); });
    const nextPause = vi.spyOn(document.querySelector('video')!, 'pause');
    component.unmount(); expect(nextPause).toHaveBeenCalled();
  });
  it('pauses when the browser is hidden and pauses other players when playback is requested', async () => {
    await open();
    const element = document.querySelector('video')!;
    const pause = vi.spyOn(element, 'pause');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    const other = document.createElement('video'); document.body.append(other); const otherPause = vi.spyOn(other, 'pause');
    fireEvent.play(element); expect(otherPause).toHaveBeenCalled(); other.remove();
  });
  it('shows saved timing and opens variant controls without generating until requested', async () => {
    const savedAnalysis = { ...analysis, segments: [{ start_seconds: 0, end_seconds: 4.2, text: 'Una primera frase real' }], uncertainties: ['No mostrar en cliente'] };
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript }] : savedAnalysis, error: null }));
    await open();
    expect(screen.queryByRole('list', { name: 'Guion por segundos' })).not.toBeInTheDocument();
    expect(screen.getByText(transcript)).toBeVisible();
    const player = document.querySelector('video')!;
    Object.defineProperty(player, 'duration', { configurable: true, value: 85.166667 });
    fireEvent.loadedMetadata(player);
    expect(screen.getByRole('list', { name: 'Guion por segundos' })).toHaveTextContent('0:00–0:04');
    await tab('Análisis');
    expect(screen.queryByText('No mostrar en cliente')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Probar otros hooks y guiones' })); });
    expect(screen.getByRole('button', { name: 'Generar variantes' })).toBeVisible();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(document.querySelectorAll('video')).toHaveLength(1);
    expect(document.querySelector('video')).not.toHaveAttribute('autoplay');
  });
  it('does not turn missing performance data into zero sales', async () => {
    await open();
    expect(screen.getByText('Ventas reportadas').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Unidades').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Vistas').nextElementSibling).toHaveTextContent('—');
  });
  it('uses real player metadata to remove impossible timing and restores untimed full transcript', async () => {
    const saved = { ...analysis, segments: [{ start_seconds: 0, end_seconds: 5, text: 'Inicio' }, { start_seconds: 66, end_seconds: 121, text: 'Cierre' }] };
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript }] : saved, error: null }));
    const component = await open();
    expect(screen.queryByRole('list', { name: 'Guion por segundos' })).not.toBeInTheDocument();
    expect(screen.getByText(transcript)).toBeVisible();
    const player = document.querySelector('video')!;
    Object.defineProperty(player, 'duration', { configurable: true, value: 85.166667 });
    fireEvent.loadedMetadata(player);
    expect(screen.queryByRole('list', { name: 'Guion por segundos' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guion original' })).toBeVisible();
    expect(screen.getByText(transcript)).toBeVisible();
    await tab('Análisis');
    expect(screen.queryByText(/Primera frase transcrita/)).not.toBeInTheDocument();
    expect(screen.getByText('Demostración')).toBeVisible();
    await act(async () => { component.rerender(view({ ...video, id: 'video-longer', video_mp4_url: 'https://storage.example/longer.mp4' })); });
    expect(screen.queryByRole('list', { name: 'Guion por segundos' })).not.toBeInTheDocument();
    const nextPlayer = document.querySelector('video')!;
    Object.defineProperty(nextPlayer, 'duration', { configurable: true, value: 122 });
    fireEvent.loadedMetadata(nextPlayer);
    expect(screen.getByRole('list', { name: 'Guion por segundos' })).toBeVisible();
    expect(document.querySelectorAll('video')).toHaveLength(1);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
  it('renders legacy saved analysis with null sections and no audiovisual arrays', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript, variants_json: null }] : { hook: 'Gancho histórico', body: null, cta: null }, error: null }));
    await open(); await tab('Análisis');
    expect(screen.getByText('Gancho histórico')).toBeVisible();
    expect(screen.queryByText('Cómo presenta el producto')).not.toBeInTheDocument();
    expect(screen.queryByText('Qué se ve en el video')).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

});
