import { useState } from "react";
import { PlayCircle } from "lucide-react";
import demoVideo from "@/assets/demo/tokxray-demo-1080p.mp4";
import demoPoster from "@/assets/demo/tokxray-demo-poster.jpg";

export function ProductDemo() {
  const [failed, setFailed] = useState(false);

  return (
    <figure id="demo" aria-labelledby="product-demo-title" className="mb-12 scroll-mt-24 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] md:mb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <h3 id="product-demo-title" className="flex items-center gap-2 text-lg font-semibold">
          <PlayCircle aria-hidden="true" className="size-5 text-brand-cyan" />
          Mira TokXray en acción.
        </h3>
        <span className="rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-1 text-xs font-medium text-brand-cyan">34 segundos · Full HD</span>
      </div>
      <video
        aria-label="Demostración de TokXray: videos, guiones y oportunidades"
        aria-describedby="product-demo-description"
        src={demoVideo}
        controls
        playsInline
        preload="none"
        poster={demoPoster}
        width={1920}
        height={1080}
        className="block aspect-video h-auto w-full bg-black object-contain"
        onError={() => setFailed(true)}
      >
        Tu navegador no puede reproducir este video. <a href={demoVideo}>Abrir demostración en MP4</a>.
      </video>
      {failed && <p role="status" className="px-5 pt-4 text-sm text-brand-mist/80 sm:px-6">
        No se pudo cargar el video. <a href={demoVideo} target="_blank" rel="noopener noreferrer" className="text-brand-cyan underline underline-offset-4">Abrir demostración en otra pestaña</a>.
      </p>}
      <figcaption className="px-5 py-5 sm:px-6">
        <p id="product-demo-description" className="max-w-3xl text-sm leading-relaxed text-brand-mist/80">
          Compara videos por ventas, abre un guion y explora sus variantes. Después, cruza productos, demanda y comisión para elegir dónde enfocar tu próximo video.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-brand-mist/55">Recorrido sin audio. Usa la pantalla completa del reproductor para ver los detalles.</p>
      </figcaption>
    </figure>
  );
}
