import { useId, useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, Target, X } from "lucide-react";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComparableOpportunity, salesForCommissionGoal } from "@/lib/opportunity-comparison";

interface ProductComparisonProps {
  products: ComparableOpportunity[];
  language: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  onViewProduct: (id: string) => void;
}

export function ProductComparison({ products, language, open, onOpenChange, onClear, onViewProduct }: ProductComparisonProps) {
  const es = language === "es";
  const goalId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [goalInput, setGoalInput] = useState("1000");
  const goal = Number(goalInput);
  const validGoal = goalInput.trim() !== "" && Number.isFinite(goal) && goal > 0;
  const locale = es ? "es-MX" : "en-US";
  const money = (amount: number | null) => amount != null && Number.isFinite(amount) && amount > 0
    ? `${new Intl.NumberFormat(locale, { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(amount)} MXN`
    : es ? "Sin dato" : "Unavailable";
  const count = (amount: number | null) => amount != null && Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat(locale).format(amount)
    : es ? "Sin dato" : "Unavailable";

  return <>
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-cyan/30 bg-brand-ink p-3 text-white sm:p-4" aria-label={es ? "Comparar productos" : "Compare products"}>
      <div className="flex min-w-0 items-center gap-3">
        <ArrowLeftRight className="size-5 shrink-0 text-brand-cyan" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-balance text-sm font-semibold">{es ? "¿Qué producto acerca más tu meta?" : "Which product gets you closer to your goal?"}</h2>
          <p className="mt-0.5 text-pretty text-xs text-white/70">{es ? "Elige 2 productos y compara cuánto dejan por venta." : "Pick 2 products and compare their commission per sale."}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm tabular-nums text-white/70" role="status" aria-live="polite" aria-label={es ? `${products.length} de 2 productos seleccionados` : `${products.length} of 2 products selected`}>{products.length}/2</span>
        {products.length > 0 && <Button variant="ghost" size="icon" className="size-11 text-white hover:bg-white/10 hover:text-white" onClick={onClear} aria-label={es ? "Limpiar comparación" : "Clear comparison"}><X className="size-4" aria-hidden="true" /></Button>}
        <Button className="min-h-11 bg-brand-cyan text-brand-ink hover:bg-brand-cyan/90" disabled={products.length !== 2} onClick={() => onOpenChange(true)}>{es ? "Comparar" : "Compare"}<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Button>
      </div>
    </section>

    <Dialog open={open && products.length === 2} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus({ preventScroll: true }); }} className="max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_2rem)] w-[calc(100%_-_1.5rem)] max-w-2xl gap-4 overflow-y-auto rounded-2xl p-4 sm:p-6 [&>button]:right-2 [&>button]:top-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="pr-9 text-left">
          <DialogTitle ref={titleRef} tabIndex={-1} className="text-balance leading-snug">{es ? "Compara antes de elegir" : "Compare before you choose"}</DialogTitle>
          <DialogDescription className="text-pretty">{es ? "Ventas del reporte disponible y comisión estimada. Los períodos pueden variar entre productos." : "Sales from the available report and estimated commission. Reporting periods can differ between products."}</DialogDescription>
        </DialogHeader>

        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          <caption className="sr-only">{es ? "Comparación de datos reportados de los productos seleccionados" : "Reported data for the selected products"}</caption>
          <thead>
            <tr className="border-b border-border">
              <th className="w-[30%] pb-3 pr-2 align-bottom font-medium text-muted-foreground" scope="col">{es ? "En el reporte" : "In the report"}</th>
              {products.map((product, index) => <th className="px-2 pb-3 align-top" scope="col" key={product.id}>
                <div className="mb-2 flex items-center gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-ink text-xs text-brand-cyan">{index === 0 ? "A" : "B"}</span><div className="size-10 shrink-0 overflow-hidden rounded-lg"><CatalogProductImage src={product.imagen_url} name={product.producto_nombre} /></div></div>
                <span className="line-clamp-3 break-words font-semibold" title={product.producto_nombre}>{product.producto_nombre}</span>
              </th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60"><th scope="row" className="py-4 pr-2 font-medium text-muted-foreground">{es ? "Ventas reportadas" : "Reported sales"}</th>{products.map(product => <td key={product.id} className="break-words px-2 py-4 font-semibold tabular-nums">{money(product.gmv_30d_calc)}</td>)}</tr>
            <tr className="border-b border-border/60"><th scope="row" className="py-4 pr-2 font-medium text-muted-foreground">{es ? "Creadores" : "Creators"}</th>{products.map(product => <td key={product.id} className="px-2 py-4 font-semibold tabular-nums">{count(product.creators_active_calc)}</td>)}</tr>
            <tr><th scope="row" className="py-4 pr-2 font-medium text-muted-foreground">{es ? "Comisión por venta" : "Commission per sale"}</th>{products.map(product => <td key={product.id} className="break-words px-2 py-4 font-semibold tabular-nums">{money(product.earning_per_sale)}</td>)}</tr>
          </tbody>
        </table>

        <section className="rounded-xl bg-brand-ink p-4 text-white" aria-label={es ? "Simulador de meta de comisiones" : "Commission goal calculator"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><Label htmlFor={goalId} className="flex items-center gap-2 text-sm"><Target className="size-4 text-brand-cyan" aria-hidden="true" />{es ? "Tu meta de comisiones" : "Your commission goal"}</Label><p className="mt-1 text-xs text-white/65">{es ? "Escenario editable · MXN" : "Editable scenario · MXN"}</p></div>
            <Input id={goalId} type="number" inputMode="decimal" min="0.01" step="any" value={goalInput} onChange={event => setGoalInput(event.target.value)} aria-invalid={!validGoal} aria-describedby={!validGoal ? `${goalId}-error` : undefined} className="h-11 w-36 border-white/25 bg-white/10 text-base font-semibold tabular-nums text-white" />
          </div>
          {!validGoal && <p id={`${goalId}-error`} role="alert" className="mt-2 text-sm text-brand-cyan">{es ? "Escribe una meta mayor a $0 MXN." : "Enter a goal greater than $0 MXN."}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3" aria-live="polite" aria-atomic="true">
            {products.map((product, index) => {
              const sales = validGoal ? salesForCommissionGoal(goal, product.earning_per_sale) : null;
              return <div key={product.id} className="min-w-0 border-t border-white/20 pt-3">
                <p className="text-xs text-white/70">{es ? "Producto" : "Product"} {index === 0 ? "A" : "B"}</p>
                <p className="mt-1 break-words text-3xl font-bold tabular-nums text-brand-cyan">{sales == null ? "—" : new Intl.NumberFormat(locale).format(sales)}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/80">{sales != null ? es ? "ventas para alcanzar tu meta" : "sales to reach your goal" : !validGoal ? es ? "Ingresa una meta válida" : "Enter a valid goal" : es ? "Sin cálculo disponible" : "Calculation unavailable"}</p>
              </div>;
            })}
          </div>
          <p className="mt-4 text-pretty text-xs leading-relaxed text-white/65">{es ? "Meta ÷ comisión por venta, redondeada hacia arriba. Es un escenario, no una predicción; depende de ventas válidas y de la comisión vigente." : "Goal ÷ commission per sale, rounded up. A scenario, not a forecast; it depends on eligible sales and the current commission."}</p>
        </section>

        <div className="grid grid-cols-2 gap-3">{products.map((product, index) => <Button key={product.id} variant="outline" className="min-h-11 whitespace-normal px-2 text-xs sm:text-sm" onClick={() => { onOpenChange(false); onViewProduct(product.id); }}>{es ? "Ver videos de" : "See videos for"} {index === 0 ? "A" : "B"}<ArrowRight className="ml-1 size-4 shrink-0" aria-hidden="true" /></Button>)}</div>
      </DialogContent>
    </Dialog>
  </>;
}
