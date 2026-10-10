import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type UserRow = {
  id: string; full_name: string; email: string | null; created_at: string;
  email_confirmed: boolean; ref_code: string | null; referral_code_used: string | null;
  referrals_registered: number; referrals_paid_active: number;
  access_kind: "paid" | "complimentary" | "trial" | "unsubscribed";
};
type Overview = {
  stats: { registered: number; email_confirmed: number; paid_active: number; complimentary_active: number; affiliate_codes: number; active_affiliates: number };
  total: number; rows: UserRow[];
};
const accessLabel: Record<UserRow["access_kind"], string> = {
  paid: "Suscripción de pago activa", complimentary: "Acceso gratuito / invitación",
  trial: "Periodo de prueba", unsubscribed: "Sin suscripción activa",
};
const PAGE_SIZE = 25;
export function UserAffiliateOverview() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setOffset(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let current = true;
    setLoading(true); setError("");
    void (async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc("get_founder_user_overview", {
          p_search: query, p_filter: filter, p_offset: offset, p_limit: PAGE_SIZE,
        });
        if (rpcError || !result) throw rpcError || new Error("No data");
        if (current) setData(result as unknown as Overview);
      } catch {
        if (current) setError("No se pudieron cargar los usuarios. Intenta actualizar de nuevo.");
      } finally { if (current) setLoading(false); }
    })();
    return () => { current = false; };
  }, [query, filter, offset, revision]);
  return <section className="space-y-5" aria-label="Usuarios y afiliados">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Usuarios y afiliados</h2>
        <p className="text-sm text-muted-foreground mt-1">Del registro a la primera recomendación. Totales de toda la plataforma.</p></div>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
    </div>
    {data && <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {([
        ["Registrados", data.stats.registered], ["Correo confirmado", data.stats.email_confirmed],
        ["Suscripciones de pago activas", data.stats.paid_active], ["Accesos gratuitos / invitaciones", data.stats.complimentary_active],
        ["Con código de afiliado", data.stats.affiliate_codes], ["Afiliados con referidos de pago activos", data.stats.active_affiliates],
      ] as const).map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-2">{value.toLocaleString("es-MX")}</p></Card>)}
    </div>}
    <p className="text-xs text-muted-foreground">Una cuenta registrada no equivale a una suscripción. Los pagos activos se cuentan por usuario, según el estado sincronizado desde Stripe; las invitaciones y pruebas no se cuentan como ventas. Un afiliado activo tiene al menos un referido con suscripción de pago vigente.</p>
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1"><span className="sr-only">Buscar por nombre, correo o código</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Nombre, correo o código" value={search} maxLength={200} onChange={e => setSearch(e.target.value)} /></label>
        <label><span className="sr-only">Filtrar usuarios</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={e => { setFilter(e.target.value); setOffset(0); }}>
          <option value="all">Todos los usuarios</option><option value="paid">Suscripción de pago activa</option><option value="unconfirmed">Correo por confirmar</option><option value="active_affiliates">Afiliados con referidos activos</option><option value="ready_affiliates">Con código, sin referidos activos</option>
        </select></label>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : loading ? <p role="status" className="text-sm text-muted-foreground">Cargando usuarios…</p> : data && <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Cuentas registradas, acceso y referidos</caption><thead className="text-xs text-muted-foreground"><tr className="border-b"><th className="py-3 pr-4">Usuario</th><th className="py-3 pr-4">Acceso</th><th className="py-3 pr-4">Código</th><th className="py-3">Referidos</th></tr></thead>
          <tbody>{data.rows.map(user => <tr key={user.id} className="border-b last:border-0 align-top">
            <td className="py-3 pr-4 min-w-[190px]"><p className="font-medium">{user.full_name}</p><p className="text-xs break-all">{user.email || "Sin correo"}</p><p className="text-xs text-muted-foreground mt-1">Registro: {new Date(user.created_at).toLocaleDateString("es-MX")}</p></td>
            <td className="py-3 pr-4 min-w-[185px]"><p>{accessLabel[user.access_kind]}</p><p className={`text-xs mt-1 ${user.email_confirmed ? "text-muted-foreground" : "text-amber-700"}`}>{user.email_confirmed ? "Correo confirmado" : "Correo por confirmar"}</p></td>
            <td className="py-3 pr-4"><code className="text-xs">{user.ref_code || "Sin código"}</code>{user.referral_code_used && <p className="text-xs text-muted-foreground mt-1">Invitado por {user.referral_code_used}</p>}</td>
            <td className="py-3 whitespace-nowrap"><p>{user.referrals_paid_active} de pago activos</p><p className="text-xs text-muted-foreground">{user.referrals_registered} registrados</p></td>
          </tr>)}</tbody></table></div>
        {!data.rows.length && <p className="text-sm text-muted-foreground">No hay usuarios con estos filtros.</p>}
        <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-muted-foreground"><span>{data.total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, data.total)} de ${data.total}` : "0 usuarios"}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0,n-PAGE_SIZE))}>Anterior</Button><Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(n => n+PAGE_SIZE)}>Siguiente</Button></div></div>
      </>}
    </Card>
  </section>;
}
