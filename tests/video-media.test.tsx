import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from '@/components/VideoCardOriginal';
vi.mock('framer-motion', () => ({ motion: { div: ({ children, className }: any) => <div className={className}>{children}</div> } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => ({ data: [{ locked: false, transcript: 'Guion del catálogo' }], error: null }) } }));
vi.mock('@/contexts/BlurGateContext', () => ({ useBlurGateContext: () => ({ hasPaid: true, isFounder: false }) }));
vi.mock('@/components/ProductAssignmentModal', () => ({ default: () => null }));
const video = { id: 'video-1', video_url: 'https://www.tiktok.com/@creator/video/123', video_mp4_url: 'https://example.com/video.mp4', thumbnail_url: 'https://example.com/poster.jpg' };
beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
describe('click-to-play catalog', () => {
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
