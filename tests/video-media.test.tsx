import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from '@/components/VideoCardOriginal';
const access = vi.hoisted(() => ({ hasPaid: true, openPaywall: vi.fn() }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => ({ data: [{ locked: false, transcript: 'Guion del catálogo' }], error: null }) } }));
vi.mock('@/contexts/BlurGateContext', () => ({ useBlurGateContext: () => ({ hasPaid: access.hasPaid, isFounder: false, openPaywall: access.openPaywall }) }));
vi.mock('@/components/ProductAssignmentModal', () => ({ default: () => null }));
const video = { id: 'video-1', video_url: 'https://www.tiktok.com/@creator/video/123', video_mp4_url: 'https://example.com/video.mp4', thumbnail_url: 'https://example.com/poster.jpg' };
beforeEach(() => { access.hasPaid = true; access.openPaywall.mockClear(); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
describe('click-to-play catalog', () => {
  it('opens the Pro offer directly when an unpaid creator clicks the script action', async () => {
    access.hasPaid = false;
    await act(async () => { render(<MemoryRouter><VideoCard video={video} ranking={1} /></MemoryRouter>); });
    fireEvent.click(screen.getByRole('button', { name: /Entender y adaptar guion/ }));
    expect(access.openPaywall).toHaveBeenCalledWith('Guion del video');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelectorAll('video')).toHaveLength(0);
  });
  it('hides rows without a stored media file', () => {
    const { container } = render(<MemoryRouter><VideoCard video={{ ...video, video_mp4_url: null }} ranking={1} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders static feed posters, opens one player on click and removes it on close', async () => {
    await act(async () => { render(<MemoryRouter><VideoCard video={video} ranking={1} /></MemoryRouter>); });
    expect(document.querySelectorAll('video')).toHaveLength(0);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Ver video y guion de creador' }));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver video y guion de creador' })); });
    expect(document.querySelectorAll('video')).toHaveLength(1);
    expect(document.querySelector('video')).not.toHaveAttribute('autoplay');
    const pause = vi.spyOn(document.querySelector('video')!, 'pause');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cerrar video' })); });
    expect(pause).toHaveBeenCalled();
    expect(document.querySelectorAll('video')).toHaveLength(0);
  });
  it('unmounts a missing-cover frame before opening the one interactive player', async () => {
    let reportVisibility!: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { reportVisibility = callback; }
      observe() {} disconnect() {}
    });
    try {
      await act(async () => { render(<MemoryRouter><VideoCard video={{ ...video, thumbnail_url: null }} ranking={1} /></MemoryRouter>); });
      await act(async () => { reportVisibility([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
      expect(document.querySelectorAll('video')).toHaveLength(1);
      expect(document.querySelector('video')).not.toHaveAttribute('controls');
      const previewPause = vi.spyOn(document.querySelector('video')!, 'pause');
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ver video y guion de creador' })); });
      expect(previewPause).toHaveBeenCalled();
      expect(document.querySelectorAll('video')).toHaveLength(1);
      expect(document.querySelector('video')).toHaveAttribute('controls');
      expect(document.querySelector('video')).not.toHaveAttribute('autoplay');
      expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

});

describe('catalog performance data', () => {
  const product = { id: 'product-1', producto_nombre: 'Producto de prueba', imagen_url: null, total_ingresos_mxn: null, commission: 15, price: 200, precio_mxn: 200, revenue_30d: null, producto_url: null };
  const metric = (label: string) => screen.getByText(label).parentElement!.nextElementSibling;
  it('keeps unknown global metrics and earnings unknown and omits an unreported rank', async () => {
    await act(async () => { render(<MemoryRouter><VideoCard video={{ ...video, product, revenue_mxn: null, sales: null, views: null }} ranking={null} /></MemoryRouter>); });
    for (const label of ['Ventas reportadas', 'Unidades vendidas', 'Vistas', 'Comisión estimada ≈']) expect(metric(label)).toHaveTextContent('—');
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
    expect(screen.getByText('$30/venta')).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });
  it('preserves genuinely reported zero sales, views and commission instead of treating them as missing', async () => {
    await act(async () => { render(<MemoryRouter><VideoCard video={{ ...video, product, revenue_mxn: 0, sales: 0, views: 0 }} ranking={57} /></MemoryRouter>); });
    expect(metric('Ventas reportadas')).toHaveTextContent('$0');
    expect(metric('Unidades vendidas')).toHaveTextContent('0');
    expect(metric('Vistas')).toHaveTextContent('0');
    expect(metric('Comisión estimada ≈')).toHaveTextContent('$0');
    expect(screen.getByText('#57')).toBeInTheDocument();
  });
  it('keeps premium masking and does not substitute a legacy price for an explicit zero', async () => {
    access.hasPaid = false;
    await act(async () => { render(<MemoryRouter><VideoCard video={{ ...video, product: { ...product, price: 0, precio_mxn: 500 }, revenue_mxn: null, sales: null, views: null }} ranking={null} /></MemoryRouter>); });
    expect(metric('Ventas reportadas')).toHaveTextContent('•••');
    expect(metric('Comisión estimada ≈')).toHaveTextContent('•••');
    expect(screen.queryByText(/\/venta/)).not.toBeInTheDocument();
  });
});
