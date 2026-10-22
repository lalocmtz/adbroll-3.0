import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductDemo } from '@/components/landing/ProductDemo';

describe('automatic product walkthrough', () => {
  let observers: Array<{ callback: IntersectionObserverCallback; options?: IntersectionObserverInit }>;
  let motion: MediaQueryList;
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;
  let load: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    observers = [];
    motion = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn((query: string) => query.includes('reduced-motion') ? motion : { matches: false }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { observers.push({ callback, options }); }
      observe() {}
      disconnect() {}
    });
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const video = () => screen.getByLabelText('Demostración de TokXray: videos, guiones y oportunidades');
  async function intersect(kind: 'preload' | 'visible', ratio: number) {
    const observer = observers.find(item => kind === 'preload' ? item.options?.rootMargin : !item.options?.rootMargin)!;
    await act(async () => { observer.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver); });
  }

  it('preloads nearby, plays without a click when visible, and pauses outside the viewport', async () => {
    render(<ProductDemo />);
    expect(video()).not.toHaveAttribute('src');
    expect(video()).not.toHaveAttribute('controls');
    expect(video()).toHaveAttribute('tabindex', '-1');
    expect(video()).toHaveAttribute('loop');
    await intersect('preload', 1);
    expect(load).toHaveBeenCalledOnce();
    expect(play).not.toHaveBeenCalled();
    await intersect('visible', 0.5);
    expect(play).toHaveBeenCalledOnce();
    pause.mockClear();
    await intersect('visible', 0);
    fireEvent(video(), new Event('canplay'));
    expect(pause).toHaveBeenCalled();
    expect(play).toHaveBeenCalledOnce();
    await intersect('visible', 0.5);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('pauses when the tab is hidden and resumes when the tab becomes visible', async () => {
    render(<ProductDemo />);
    await intersect('visible', 1);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    await act(async () => { fireEvent(document, new Event('visibilitychange')); });
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('keeps a still preview for reduced motion and responds to preference changes', async () => {
    Object.assign(motion, { matches: true });
    render(<ProductDemo />);
    await intersect('visible', 1);
    expect(load).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    Object.assign(motion, { matches: false });
    await act(async () => { motion.dispatchEvent(new Event('change')); });
    expect(play).toHaveBeenCalledOnce();
    Object.assign(motion, { matches: true });
    motion.dispatchEvent(new Event('change'));
    expect(pause).toHaveBeenCalled();
  });

  it('handles blocked autoplay without showing a false download error', async () => {
    play.mockRejectedValue(new DOMException('Autoplay blocked', 'NotAllowedError'));
    render(<ProductDemo />);
    await intersect('visible', 1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(play).toHaveBeenCalledOnce();
  });

  it('does not let a pending play promise continue after leaving the section', async () => {
    let completePlay!: () => void;
    play.mockReturnValue(new Promise<void>(resolve => { completePlay = resolve; }));
    const { unmount } = render(<ProductDemo />);
    await intersect('visible', 1);
    await intersect('visible', 0);
    unmount();
    pause.mockClear();
    await act(async () => { completePlay(); });
    expect(pause).toHaveBeenCalled();
  });

  it('resumes if a tab is hidden and shown before the pending play attempt is aborted', async () => {
    let abortPlay!: (error: DOMException) => void;
    play.mockReturnValueOnce(new Promise<void>((_, reject) => { abortPlay = reject; }));
    render(<ProductDemo />);
    await intersect('visible', 1);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => { abortPlay(new DOMException('Paused while starting', 'AbortError')); });
    expect(play).toHaveBeenCalledTimes(2);
  });
});
