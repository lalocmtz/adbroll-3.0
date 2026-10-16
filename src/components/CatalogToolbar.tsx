import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CatalogInfo({ children, label = "Información de los datos" }: { children: ReactNode; label?: string }) {
  return <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" aria-label={label}>
        <Info className="size-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] text-xs text-pretty leading-relaxed space-y-2">
      {children}
    </PopoverContent>
  </Popover>;
}

export function CatalogHeader({ title, count, children }: { title: string; count?: ReactNode; children?: ReactNode }) {
  return <div className="flex min-w-0 items-center justify-between gap-2 mb-1">
    <h1 className="min-w-0 text-base md:text-lg font-bold text-foreground text-balance leading-snug">{title}</h1>
    <div className="flex shrink-0 items-center gap-1">
      {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{count}</span>}
      {children}
    </div>
  </div>;
}

export function CatalogFilterBar({ children, label = "Filtros del catálogo", className }: { children: ReactNode; label?: string; className?: string }) {
  return <div role="group" aria-label={label} className={cn("flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 mb-3 scrollbar-hide [&>*]:shrink-0", className)}>
    {children}
  </div>;
}
