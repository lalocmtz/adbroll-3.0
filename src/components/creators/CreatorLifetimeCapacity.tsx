import { Loader2, RefreshCw } from "lucide-react";
import { useCreatorLifetimeCapacity, type CreatorLifetimeCapacityState } from "@/hooks/useCreatorLifetimeCapacity";

interface Props {
  state?: CreatorLifetimeCapacityState;
  tone?: "light" | "dark";
  compact?: boolean;
}

function CapacityDisplay({ state, tone = "light", compact = false }: Props & { state: CreatorLifetimeCapacityState }) {
  const dark = tone === "dark";
  const { capacity, loading, error, refresh } = state;
  return <section aria-label="Disponibilidad del programa vitalicio" className={`rounded-2xl border ${compact ? "p-4" : "p-5 sm:p-6"} ${dark ? "border-white/15 bg-white/5 text-white" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-[#25f4ee]/10 text-[#25f4ee]" : "bg-primary/10 text-primary"}`}>Primeros 100 creadores aprobados</span>
    {loading ? <p role="status" className="flex items-center gap-2 text-sm mt-3"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Verificando accesos disponibles…</p> : error || !capacity ? <div role="alert" className="mt-3 space-y-3 text-sm"><p>{error || "La disponibilidad aún no está confirmada."}</p><button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-current/20 px-3 font-medium"><RefreshCw aria-hidden="true" className="h-4 w-4" />Reintentar disponibilidad</button></div> : <div className="mt-3 space-y-3" aria-live="polite">
      <p className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} font-semibold tracking-tight`}>{capacity.is_open ? `${capacity.remaining === 1 ? "Queda" : "Quedan"} ${capacity.remaining} de ${capacity.limit} accesos vitalicios` : "Los 100 accesos vitalicios ya fueron otorgados"}</p>
      <div role="progressbar" aria-label="Accesos vitalicios otorgados" aria-valuemin={0} aria-valuemax={capacity.limit} aria-valuenow={capacity.claimed} aria-valuetext={`${capacity.claimed} de ${capacity.limit} otorgados`} className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-200"}`}><div className={`h-full rounded-full ${dark ? "bg-[#25f4ee]" : "bg-primary"}`} style={{ width: `${capacity.claimed / capacity.limit * 100}%` }} /></div>
      <p className={`text-xs leading-relaxed ${dark ? "text-white/70" : "text-slate-600"}`}>{capacity.is_open ? "El lugar se asigna al aprobar tus tres videos originales publicados y el permiso de pauta por 12 meses. Crear tu cuenta, recibir una prueba o enviar enlaces no reserva un lugar." : "Las nuevas solicitudes están cerradas. Los accesos vitalicios ya aprobados se mantienen; una solicitud pendiente no reserva lugar."}</p>
    </div>}
  </section>;
}

function ConnectedCapacity(props: Omit<Props, "state">) {
  const state = useCreatorLifetimeCapacity();
  return <CapacityDisplay {...props} state={state} />;
}

/** Pass a shared state when the surrounding form also needs to gate submissions. */
export function CreatorLifetimeCapacity({ state, ...props }: Props) {
  return state ? <CapacityDisplay {...props} state={state} /> : <ConnectedCapacity {...props} />;
}
