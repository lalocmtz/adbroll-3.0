import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Affiliate = { id: string; ref_code: string; email: string; usd_available: number; payout_hold: boolean; pending_withdrawal: boolean };
type Payment = { id: string; ref_code: string; amount: number; manual_reference: string; created_at: string };
// These RPCs enforce founder authorization in PostgreSQL; UI visibility is not authorization.
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as never, args as never);
const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export function ManualAffiliatePayments() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  async function refresh() {
    const { data, error } = await rpc("get_manual_affiliate_payments");
    if (error || !data) { setLoadError("No se pudo cargar el registro de pagos. Comprueba que la migración de pagos manuales esté instalada."); return; }
    const result = data as unknown as { affiliates: Affiliate[]; payments: Payment[] };
    setAffiliates(result.affiliates); setPayments(result.payments); setLoadError("");
  }
  useEffect(() => { void refresh(); }, []);
  const affiliate = affiliates.find(a => a.id === selected);
  async function record() {
    if (!confirmed || !affiliate || busy) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await rpc("record_manual_affiliate_payment", { p_affiliate_id: affiliate.id, p_amount: Number(amount), p_reference: reference.trim() });
      if (error) throw error;
      setMessage("Transferencia registrada. El saldo y el historial del afiliado se actualizaron.");
      setReference(""); setAmount(""); setConfirmed(false); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String((error as { message?: string }).message || "No se pudo registrar. Conserva la misma referencia al reintentar.")); }
    finally { setBusy(false); }
  }
  return <Card className="p-5 space-y-4">
    <h2 className="font-semibold text-lg">Pagos manuales a afiliados</h2>
    <p className="text-sm text-muted-foreground">Revisa el saldo, realiza el depósito desde tu banco y registra su referencia única. Este formulario registra una transferencia ya realizada; no envía dinero. Los saldos se contabilizan en USD. Si depositas MXN, acuerda el equivalente con el afiliado antes de registrar el importe liquidado en USD.</p>
    {loadError ? <p role="alert" className="text-destructive">{loadError}</p> : <>
      <label className="block text-sm">Afiliado<select className="block w-full border rounded p-2 mt-1 bg-background" value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setAmount(""); setReference(""); setConfirmed(false); }}>
        <option value="">Selecciona un afiliado</option>{affiliates.map(a => <option key={a.id} value={a.id}>{a.ref_code} · {a.email} · {usd(a.usd_available)}{a.payout_hold || a.pending_withdrawal ? " · En revisión" : ""}</option>)}
      </select></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">Importe liquidado en USD<Input type="number" min="50" step="0.01" value={amount} disabled={busy} onChange={e => { setAmount(e.target.value); setConfirmed(false); }} /></label>
        <label className="text-sm">Referencia única del depósito<Input value={reference} maxLength={160} disabled={busy} onChange={e => { setReference(e.target.value); setConfirmed(false); }} placeholder="Banco y folio de transferencia" /></label>
      </div>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Confirmo que el depósito ya se realizó y corresponde a este afiliado.</label>
      <Button onClick={record} disabled={busy || !confirmed || !affiliate || affiliate.payout_hold || affiliate.pending_withdrawal || !Number.isFinite(Number(amount)) || Number(amount)<50 || Number(amount)>Number(affiliate.usd_available) || reference.trim().length<6}>{busy ? "Registrando…" : "Registrar depósito realizado"}</Button>
      <p role="status" className="text-sm">{message}</p>
      <h3 className="font-medium">Últimos depósitos registrados</h3>
      {!payments.length && <p className="text-sm text-muted-foreground">Todavía no hay depósitos manuales registrados.</p>}
      {payments.map(p => <div key={p.id} className="text-sm border-t pt-2 flex flex-wrap justify-between gap-2"><span>{p.ref_code} · {new Date(p.created_at).toLocaleDateString("es-MX")} · {p.manual_reference}</span><strong>{usd(p.amount)}</strong></div>)}
    </>}
  </Card>;
}
