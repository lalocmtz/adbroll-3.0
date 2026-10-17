import { useEffect, useRef, useState } from 'react';

/** Until a cover is prepared, request one silent frame only for visible cards. */
export function LazyVideoPoster({ src, poster, active = true }: { src: string; poster?: string | null; active?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const hasPoster = !!poster && !posterFailed;
  const showPreview = active && visible && !hasPoster;
  useEffect(() => { setPosterFailed(false); }, [poster]);
  useEffect(() => {
    const element = container.current;
    if (!element || hasPoster || !active) { setVisible(false); return; }
    let mounted = true;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setVisible(rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth);
    };
    if (typeof IntersectionObserver === 'undefined') {
      update();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
    }
    const observer = new IntersectionObserver(entries => {
      if (mounted) setVisible(entries.some(entry => entry.isIntersecting));
    }, { threshold: 0.01, rootMargin: '0px' });
    observer.observe(element);
    return () => { mounted = false; observer.disconnect(); };
  }, [hasPoster, active]);
  useEffect(() => {
    const element = preview.current;
    return () => { element?.pause(); };
  }, [showPreview, src]);

  return <div ref={container} className="pointer-events-none h-full w-full" aria-hidden="true">
    {hasPoster ? <img src={poster!} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setPosterFailed(true)} /> : showPreview ?
      <video ref={preview} src={`${src.split('#')[0]}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" disablePictureInPicture
        className="pointer-events-none h-full w-full object-cover" onPlay={event => { event.currentTarget.muted = true; event.currentTarget.pause(); }} /> : null}
  </div>;
}
