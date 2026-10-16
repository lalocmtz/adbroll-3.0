import { useEffect, useRef, useState } from 'react';

/** A single, user-started player. Cards use posters, never background playback. */
export function CatalogVideoPlayer({ src, poster, title, active = true }: { src: string; poster?: string | null; title: string; active?: boolean }) {
  const player = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    const element = player.current;
    const pause = () => element?.pause();
    const onVisibility = () => { if (document.visibilityState !== 'visible') pause(); };
    if (!active) pause();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); pause(); };
  }, [src, active]);
  const playbackSource = poster ? src : `${src.split('#')[0]}#t=0.1`;
  return <div className="mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-black">
    <video ref={player} src={playbackSource} poster={poster || undefined} aria-label={title} controls playsInline preload="metadata"
      className="aspect-[9/16] h-[40dvh] max-h-[40dvh] w-auto max-w-full object-contain md:h-[66dvh] md:max-h-[66dvh]" hidden={failed}
      onError={() => { player.current?.pause(); setFailed(true); }}
      onPlay={() => { document.querySelectorAll('video').forEach(other => { if (other !== player.current) other.pause(); }); }} />
    {failed && <p role="alert" className="p-6 text-center text-sm text-white">No pudimos reproducir este video. Puedes abrir el original en TikTok.</p>}
  </div>;
}
