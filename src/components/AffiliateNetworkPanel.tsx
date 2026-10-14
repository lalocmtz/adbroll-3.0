import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AffiliateNetwork {
  leader: { code: string; joined_at: string } | null;
  can_join: boolean;
  direct_creators: number;
  indirect_creators: number;
  direct_customers: number;
  direct_active_customers: number;
  indirect_customers: number;
  indirect_active_customers: number;
  direct_earned: number;
  indirect_earned: number;
  members: Array<{ code: string; email_masked: string; joined_at: string; customers: number; active_customers: number; leader_earned: number }>;
  indirect_commissions: Array<{ amount: number; type: string; month: string; status: string; date: string }>;
}
const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(value);

export function AffiliateNetworkPanel({ code, onJoined }: { code: string; onJoined: () => void }) {
  const [params] = useSearchParams();
  const [leaderCode, setLeaderCode] = useState(() => (params.get("leader") || "").toUpperCase());
  const [accepted, setAccepted] = useState(false);
  const [joining, setJoining] = useState(false);
  const [network, setNetwork] = useState<AffiliateNetwork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const { toast } = useToast();
  const link = `https://tokxray.com/programa-creadores?leader=${encodeURIComponent(code)}`;

  useEffect(() => {
    let active = true;
    setError(null);
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_affiliate_network" as never);
        if (rpcError) throw rpcError;
        const result = data as unknown as AffiliateNetwork & { error?: string };
        if (!result || result.error) throw new Error(result?.error || "No se recibió la información de tu comunidad.");
        if (active) setNetwork(result);
      } catch {
        if (active) setError("No pudimos cargar tu comunidad. Vuelve a intentar; tus comisiones permanecen registradas.");
      }
    })();
    return () => { active = false; };
  }, [reload]);

  async function join() {
    if (!accepted || !/^[A-Z0-9]{4,12}$/.test(leaderCode)) return;
    setJoining(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("join_affiliate_network" as never, {
        p_leader_code: leaderCode, p_accept_terms: true,
      } as never);
      if (rpcError) throw rpcError;
      const result = data as unknown as { success?: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || "No pudimos vincular la comunidad.");
      toast({ title: "Comunidad vinculada", description: "Conservas tus comisiones directas. Ya puedes invitar clientes con tu código." });
      setReload(value => value + 1);
      setAccepted(false);
      onJoined();
    } catch (cause) {
      toast({ title: "No se pudo aceptar la invitación", description: cause instanceof Error ? cause.message : (cause as { message?: string })?.message || "Intenta de nuevo.", variant: "destructive" });
    } finally { setJoining(false); }
  }

  return <Card className="p-5 space-y-5 min-w-0" aria-label="Tu comunidad de creadores">
    <div><h3 className="font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Tu comunidad de creadores</h3><p className="text-sm text-muted-foreground mt-2">Ayuda a otros creadores a elegir referencias y explicar cómo preparan sus guiones. Si aceptan unirse a tu comunidad antes de generar clientes de pago, recibes 5% de las renovaciones elegibles de sus clientes directos. Ellos conservan su 15%.</p></div>
    <div className="space-y-2"><label htmlFor="community-link" className="text-xs font-medium">Enlace para invitar creadores a tu comunidad</label><div className="flex gap-2 min-w-0"><Input id="community-link" className="min-w-0" readOnly value={link} /><Button aria-label="Copiar enlace de comunidad" className="shrink-0" disabled={!code} onClick={async () => { try { await navigator.clipboard.writeText(link); toast({ title: "Enlace de comunidad copiado" }); } catch { toast({ title: "Selecciona y copia el enlace", variant: "destructive" }); } }}><Copy className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">Para recomendar una suscripción, usa tu enlace de cliente de arriba. Este enlace invita a colaborar; no vincula a nadie sin su aceptación.</p></div>
    {error ? <div role="alert" className="text-sm space-y-2"><p>{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Reintentar</Button></div> : !network ? <p role="status" className="text-sm text-muted-foreground">Cargando comunidad…</p> : <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ["Creadores invitados directamente", network.direct_creators],
          ["Clientes directos registrados", network.direct_customers],
          ["Clientes indirectos registrados", network.indirect_customers],
          ["Clientes directos activos", network.direct_active_customers],
          ["Clientes indirectos activos", network.indirect_active_customers],
          ["Creadores invitados por tu comunidad", network.indirect_creators],
        ].map(([label, value]) => <div className="rounded-xl bg-muted/50 p-3 min-w-0" key={String(label)}><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
      </div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3"><p className="font-semibold tabular-nums">{money(network.direct_earned)} USD</p><p className="text-xs text-muted-foreground">Ganado por clientes directos</p></div><div className="rounded-xl border p-3"><p className="font-semibold tabular-nums">{money(network.indirect_earned)} USD</p><p className="text-xs text-muted-foreground">Ganado por renovaciones indirectas (5%)</p></div></div>
      <p className="text-xs text-muted-foreground">Estos conteos miden grupos distintos; no los sumes como si fueran personas únicas. Los creadores invitados por tu comunidad se muestran para seguimiento, pero sus ventas no te generan comisión. No se paga por registros gratuitos ni por una primera compra indirecta. US$29 × 5% = US$1.45 por renovación completa elegible.</p>
      {network.leader ? <div className="rounded-xl border p-4 text-sm"><p>Tu comunidad: <strong>{network.leader.code}</strong></p><p className="text-muted-foreground mt-1">La vinculación está registrada. Conservas US$10 por el primer pago y 15% de las renovaciones de tus clientes directos.</p></div> : network.can_join ? <div className="rounded-xl border p-4 space-y-3">
        <h4 className="font-medium">¿Un líder te invitó?</h4><label className="text-xs block" htmlFor="leader-code">Código del líder</label><Input id="leader-code" value={leaderCode} onChange={e => { setLeaderCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setAccepted(false); }} maxLength={12} placeholder="Ej. LALO" autoCapitalize="characters" />
        <label className="flex items-start gap-3 text-xs leading-relaxed"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 shrink-0" />Acepto vincularme a esta comunidad. El líder recibirá 5% de las renovaciones de mis clientes directos, sin reducir mi 15%. No podré cambiar de líder desde mi panel ni atribuir ventas anteriores. He leído las condiciones del programa.</label>
        <a href="/terminos-afiliados" className="text-xs underline">Leer condiciones</a><Button className="w-full sm:w-auto sm:ml-4" onClick={join} disabled={!accepted || !/^[A-Z0-9]{4,12}$/.test(leaderCode) || joining}>{joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Aceptar invitación de comunidad</Button>
      </div> : <p className="text-sm text-muted-foreground">La vinculación a un líder debe realizarse antes de generar clientes de pago. Si necesitas ayuda, contacta a soporte.</p>}
      <div className="space-y-3"><h4 className="font-medium">Creadores de tu comunidad directa</h4>{network.members.length ? network.members.map(member => <div className="rounded-xl bg-muted/50 p-3 text-sm flex flex-wrap gap-3 justify-between" key={member.code}><div><p className="font-medium">{member.code}</p><p className="text-xs text-muted-foreground">{member.email_masked}</p></div><div className="text-xs"><p>{member.customers} clientes · {member.active_customers} activos</p><p>{money(member.leader_earned)} USD para ti</p></div></div>) : <p className="text-sm text-muted-foreground">Todavía no hay creadores en tu comunidad. Comparte este enlace con quienes quieras acompañar; aparecerán cuando acepten la invitación.</p>}</div>
      {network.indirect_commissions.length > 0 && <div className="space-y-3"><h4 className="font-medium">Comisiones por renovaciones indirectas</h4>{network.indirect_commissions.map((commission, index) => <div className="rounded-xl bg-muted/50 p-3 text-sm flex justify-between gap-2" key={`${commission.date}-${index}`}><div><p>{new Date(commission.date).toLocaleDateString("es-MX")}</p><p className="text-xs text-muted-foreground">{commission.status === "paid" ? "Pagada" : commission.status === "reversed" ? "Revertida" : "Registrada"}</p></div><strong>{money(commission.amount)} USD</strong></div>)}</div>}
    </>}
  </Card>;
}
