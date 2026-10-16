import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyVideoPoster } from '@/components/LazyVideoPoster';
const observers: { notify: IntersectionObserverCallback; target?: Element; disconnect: ReturnType<typeof vi.fn> }[] = [];
async function visible(index: number, isIntersecting: boolean) {
  await act(async () => { observers[index].notify([{ isIntersecting, target: observers[index].target } as IntersectionObserverEntry], {} as IntersectionObserver); });
}
beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', class {
    entry: typeof observers[number];
    constructor(notify: IntersectionObserverCallback) { this.entry = { notify, disconnect: vi.fn() }; observers.push(this.entry); }
    observe(target: Element) { this.entry.target = target; }
    disconnect() { this.entry.disconnect(); }
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('lazy static frame fallback', () => {
  it('limits media requests to visible cards and unloads previews outside the viewport', async () => {
    render(<>{Array.from({ length: 20 }, (_, index) => <LazyVideoPoster key={index} src={`https://example.com/${index}.mp4`} />)}</>);
    expect(document.querySelectorAll('video')).toHaveLength(0);
    expect(observers).toHaveLength(20);
    await visible(0, true); await visible(1, true);
    expect(document.querySelectorAll('video')).toHaveLength(2);
    const first = document.querySelector('video')!;
    expect(first).toHaveAttribute('src', 'https://example.com/0.mp4#t=0.1');
    expect(first).toHaveAttribute('preload', 'metadata');
    expect(first.muted).toBe(true);
    expect(first).not.toHaveAttribute('controls');
    expect(first).not.toHaveAttribute('autoplay');
    expect(first).toHaveAttribute('tabindex', '-1');
    expect(first).toHaveAttribute('aria-hidden', 'true');
    const pause = vi.spyOn(first, 'pause');
    await visible(0, false);
    expect(pause).toHaveBeenCalled();
    expect(document.querySelectorAll('video')).toHaveLength(1);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
  it('uses a real poster when present and falls back only if that image fails', async () => {
    const { container } = render(<LazyVideoPoster src="https://example.com/video.mp4" poster="https://example.com/poster.jpg" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/poster.jpg');
    expect(observers).toHaveLength(0);
    await act(async () => { fireEvent.error(container.querySelector('img')!); });
    await visible(0, true);
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://example.com/video.mp4#t=0.1');
  });
  it('pauses unexpected playback and removes the preview while its modal is active', async () => {
    const view = render(<LazyVideoPoster src="https://example.com/video.mp4" />);
    await visible(0, true);
    const element = document.querySelector('video')!;
    const pause = vi.spyOn(element, 'pause');
    element.muted = false;
    fireEvent.play(element);
    expect(element.muted).toBe(true);
    expect(pause).toHaveBeenCalledOnce();
    await act(async () => { view.rerender(<LazyVideoPoster src="https://example.com/video.mp4" active={false} />); });
    expect(document.querySelectorAll('video')).toHaveLength(0);
    expect(pause).toHaveBeenCalledTimes(2);
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});
