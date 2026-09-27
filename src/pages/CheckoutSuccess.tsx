import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/analytics";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "paid" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const sessionId = params.get("session_id");
  useEffect(() => {
    let active = true;
    setStatus("loading");
    async function verify() {
      if (!sessionId) { if (active) setStatus("error"); return; }
      try {
        const { data, error } = await supabase.functions.invoke("checkout-status", { body: { session_id: sessionId } });
        if (!active) return;
        if (error || !data?.paid) { setStatus("error"); return; }
        trackPurchase(data.amount / 100, data.currency.toUpperCase(), sessionId, undefined, "TokXray Pro");
        setStatus("paid");
      } catch { if (active) setStatus("error"); }
    }
    void verify();
    return () => { active = false; };
  }, [sessionId, retry]);
  return <main className="min-h-screen flex items-center justify-center p-6 bg-background"><div className="max-w-lg text-center space-y-6">
    {status === "loading" ? <><Loader2 className="animate-spin mx-auto" /><h1 className="text-2xl font-bold">Verificando tu pago…</h1></> : status === "paid" ? <><CheckCircle className="h-12 w-12 text-green-600 mx-auto" /><h1 className="text-3xl font-bold">Pago recibido</h1><p className="text-muted-foreground">Tu acceso se activará cuando Stripe confirme la suscripción. Si todavía aparece pendiente, espera unos instantes y vuelve a entrar. No necesitas pagar otra vez.</p><Link className="inline-block rounded-lg bg-primary px-6 py-3 text-primary-foreground" to="/app">Explorar videos</Link><p><Link className="text-primary underline" to="/affiliates">Ir a mi panel de afiliados</Link></p><p className="text-sm text-muted-foreground">¿Se cerró tu sesión? <Link className="underline" to="/login?redirect=%2Fapp">Entra con la cuenta que usaste para pagar.</Link></p></> : <><h1 className="text-2xl font-bold">Aún no podemos confirmar tu pago</h1><p>Si ya pagaste, no repitas el cobro. Revisa tu cuenta o intenta verificar otra vez.</p><button className="rounded-lg bg-primary px-6 py-3 text-primary-foreground" onClick={() => setRetry(value => value + 1)}>Verificar de nuevo</button><p><Link className="text-primary underline" to="/login">Entrar a mi cuenta</Link> · <Link className="text-primary underline" to="/support">Contactar soporte</Link></p></>}
  </div></main>;
}
