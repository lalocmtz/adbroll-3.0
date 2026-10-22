import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/** Failed or missing product photos have an explicit fallback, never a blank tile. */
export function CatalogProductImage({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src ? <img src={src} alt={name} loading="lazy" className={cn("h-full w-full object-cover", className)} onError={() => setFailedSource(src)} />
    : <div role="img" aria-label={`Imagen no disponible: ${name}`} className={cn("flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg bg-muted text-muted-foreground", className)}>
      <Package className="size-8" aria-hidden="true" />
      <span className="text-[10px]">Sin foto</span>
    </div>;
}
