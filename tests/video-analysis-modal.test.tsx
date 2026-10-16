import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import VideoAnalysisModalOriginal from '@/components/VideoAnalysisModalOriginal';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), toast: vi.fn(), hasPaid: true, openPaywall: vi.fn() }));
vi.mock('@/contexts/BlurGateContext', () => ({ useBlurGateContext: () => ({ hasPaid: mocks.hasPaid, openPaywall: mocks.openPaywall }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/checkout', () => ({ useStartCheckout: () => ({ start: vi.fn(), loading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, functions: { invoke: mocks.invoke },
  auth: { getUser: async () => ({ data: { user: null } }) },
} }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children, initial, animate, transition, ...props }: any) => <div {...props}>{children}</div> }, AnimatePresence: ({ children }: any) => children }));

const video = { id: 'video-a', video_url: 'https://www.tiktok.com/@creator/video/1234567890123456789', title: 'Video de prueba' };
const result = { success: true, transcript: 'Guion real recuperado.', analysis: { hook: 'Inicio', body: 'Demostración', cta: 'Conoce el producto' }, variants: { hooks: ['Uno', 'Dos', 'Tres'], body_variant: 'Cuerpo' } };
const view = (v = video, isOpen = true) => <MemoryRouter><VideoAnalysisModalOriginal video={v} isOpen={isOpen} onClose={() => {}} /></MemoryRouter>;
async function open(v = video) {
  let component: ReturnType<typeof render>;
  await act(async () => { component = render(view(v)); });
  return component!;
}
async function generate() {
  await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Generar transcripción' })[0]); });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasPaid = true;
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript: null }] : null, error: null }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('active catalog video transcription', () => {
  it('waits for the deployed downloader and analyzes its ready video ID', async () => {
    vi.useFakeTimers();
    mocks.invoke.mockResolvedValueOnce({ data: { status: 'pending', retryAfterSeconds: 3 }, error: null })
      .mockResolvedValueOnce({ data: { status: 'ready', videoId: 'downloaded-video' }, error: null })
      .mockResolvedValueOnce({ data: result, error: null });
    await open(); await generate();
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(['catalog-download']);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(['catalog-download', 'catalog-download', 'transcribe-and-analyze']);
    expect(mocks.invoke.mock.calls[0][1].body).toEqual({ videoUrl: video.video_url });
    expect(mocks.invoke.mock.calls[2][1].body).toEqual({ videoId: 'downloaded-video' });
    expect(screen.getAllByText(result.transcript).length).toBeGreaterThan(0);
  });

  it('keeps the provider error visible and retries without an empty success state', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: 'HTTP error', context: { json: async () => ({ error: 'El servicio está ocupado. Inténtalo de nuevo.' }) } } });
    await open({ ...video, video_mp4_url: 'https://storage.example/video.mp4' } as typeof video); await generate();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('El servicio está ocupado');
    expect(screen.getAllByRole('button', { name: 'Reintentar transcripción' })[0]).toBeEnabled();
    mocks.invoke.mockResolvedValueOnce({ data: result, error: null });
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar transcripción' })[0]); });
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getAllByText(result.transcript).length).toBeGreaterThan(0);
  });

  it('shows RPC loading failures and retries retrieval without charging for a new analysis', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await open();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('No se pudo cargar el guion guardado');
    expect(screen.getAllByRole('button', { name: 'Generar transcripción' })[0]).toBeDisabled();
    mocks.rpc.mockResolvedValueOnce({ data: [{ locked: false, transcript: result.transcript }], error: null });
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar carga' })[0]); });
    expect(screen.getAllByText(result.transcript).length).toBeGreaterThan(0);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('stops download polling when the modal closes', async () => {
    vi.useFakeTimers();
    mocks.invoke.mockResolvedValue({ data: { status: 'pending', retryAfterSeconds: 3 }, error: null });
    const component = await open(); await generate();
    await act(async () => { component.rerender(view(video, false)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(90000); });
    expect(mocks.invoke).toHaveBeenCalledOnce();
  });

  it('does not show a previous video response after switching videos', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.rpc.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const component = await open();
    await act(async () => { component.rerender(view({ ...video, id: 'video-b' })); });
    await act(async () => { resolveOld({ data: [{ locked: false, transcript: 'Guion del video anterior' }], error: null }); });
    expect(screen.queryByText('Guion del video anterior')).not.toBeInTheDocument();
  });

  it('rejects an empty transcript and never calls legacy download', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { ...result, transcript: '  ' }, error: null });
    await open({ ...video, video_mp4_url: 'https://storage.example/video.mp4' } as typeof video); await generate();
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('No se detectó voz para transcribir');
    expect(mocks.invoke.mock.calls.map(([name]) => name)).toEqual(['transcribe-and-analyze']);
  });

  it('only offers translation to paid users without replacing their original transcript', async () => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'get_video_script' ? [{ locked: false, transcript: result.transcript }] : null, error: null }));
    const component = await open();
    expect(screen.getAllByRole('button', { name: 'Traducir al inglés' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(result.transcript).length).toBeGreaterThan(0);
    mocks.hasPaid = false;
    await act(async () => { component.rerender(view()); });
    expect(screen.queryByRole('button', { name: 'Traducir al inglés' })).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

});
