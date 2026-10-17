import { useEffect, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import demoVideo from "@/assets/demo/tokxray-demo-1080p.mp4";
import mobileDemoVideo from "@/assets/demo/tokxray-demo-720p.mp4";
import demoPoster from "@/assets/demo/tokxray-demo-poster.jpg";

export function ProductDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const source = window.matchMedia("(max-width: 767px)").matches ? mobileDemoVideo : demoVideo;
    let active = true;
    let nearby = false;
    let visible = false;
    let loaded = false;
    let starting = false;
    let resumeRequested = false;
    video.muted = true;
    video.defaultMuted = true;

    const shouldPlay = () => active && visible && !document.hidden && !motion.matches;
    const syncPlayback = () => {
      if (!active) return;
      if (nearby && !motion.matches && !loaded) {
        loaded = true;
        video.src = source;
        video.load();
      }
      if (!loaded) return;
      if (!shouldPlay()) {
        resumeRequested = false;
        video.pause();
      } else if (starting) {
        resumeRequested = true;
      } else if (video.paused) {
        starting = true;
        let interrupted = false;
        // Autoplay may be blocked by a browser's energy/data policy. Keep the poster in that case.
        void video.play().then(() => {
          if (!shouldPlay()) video.pause();
        }).catch((error: unknown) => {
          interrupted = error instanceof DOMException && error.name === "AbortError";
        }).finally(() => {
          starting = false;
          const resume = interrupted && resumeRequested && shouldPlay();
          resumeRequested = false;
          if (resume) syncPlayback();
        });
      }
    };

    const preloadObserver = new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting;
      syncPlayback();
    }, { rootMargin: "600px 0px" });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      if (visible) nearby = true;
      syncPlayback();
    }, { threshold: [0, 0.15] });
    preloadObserver.observe(video);
    visibilityObserver.observe(video);
    video.addEventListener("canplay", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    if (motion.addEventListener) motion.addEventListener("change", syncPlayback);
    else motion.addListener(syncPlayback);

    return () => {
      active = false;
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
      video.removeEventListener("canplay", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      if (motion.removeEventListener) motion.removeEventListener("change", syncPlayback);
      else motion.removeListener(syncPlayback);
      if (loaded) video.pause();
    };
  }, []);

  return (
    <figure id="demo" aria-labelledby="product-demo-title" className="mb-12 scroll-mt-24 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] md:mb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <h3 id="product-demo-title" className="flex items-center gap-2 text-lg font-semibold">
          <Clapperboard aria-hidden="true" className="size-5 text-brand-cyan" />
          Mira TokXray en acción.
        </h3>
        <span className="rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-1 text-xs font-medium text-brand-cyan">Recorrido automático · 34 s</span>
      </div>
      <video
        ref={videoRef}
        aria-label="Demostración de TokXray: videos, guiones y oportunidades"
        aria-describedby="product-demo-description"
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        preload="auto"
        poster={demoPoster}
        width={1920}
        height={1080}
        className="pointer-events-none block aspect-video h-auto w-full select-none bg-black object-contain"
        onError={() => setFailed(true)}
      >
        Recorrido por los videos, guiones, variantes y oportunidades de TokXray.
      </video>
      {failed && <p role="status" className="px-5 pt-4 text-sm text-brand-mist/80 sm:px-6">
        El recorrido animado no está disponible. Puedes conocer las funciones en las capturas de abajo.
      </p>}
      <figcaption className="px-5 py-5 sm:px-6">
        <p id="product-demo-description" className="max-w-3xl text-sm leading-relaxed text-brand-mist/80">
          Compara videos por ventas, abre un guion y explora sus variantes. Después, cruza productos, demanda y comisión para elegir dónde enfocar tu próximo video.
        </p>
      </figcaption>
    </figure>
  );
}
