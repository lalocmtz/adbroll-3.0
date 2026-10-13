import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SubscriptionPrice, CurrencyDisclosure } from '@/components/SubscriptionPrice';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useStartCheckout } from '@/lib/checkout';
import { getStoredRefCode, persistRefCode, clearStoredRefCode } from '@/lib/attribution';

export function SubscriptionOffer() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => params.get('ref') || getStoredRefCode() || '');
  const [codeStatus, setCodeStatus] = useState<'empty'|'checking'|'valid'|'invalid'|'error'>(code ? 'checking' : 'empty');
  const [savedCode, setSavedCode] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { isPro, loading: accessLoading } = useSubscription();
  const { startWithReferral, loading } = useStartCheckout();
  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) { setAuthReady(true); return; }
      setSignedIn(!!session);
      if (session) {
        const { data } = await supabase.from('profiles').select('referral_code_used').eq('id', session.user.id).maybeSingle();
        if (!active) return;
        if (data?.referral_code_used) { setCode(data.referral_code_used); setSavedCode(true); }
      }
      setAuthReady(true);
    }
    void load().catch(() => {
      if (active) { setAuthReady(true); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const normalized = code.trim().toUpperCase();
    if (!normalized) { setCodeStatus('empty'); return; }
    setCodeStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('validate_referral_code', { p_code: normalized });
        if (active) setCodeStatus(error ? 'error' : data ? 'valid' : 'invalid');
      } catch { if (active) setCodeStatus('error'); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [code]);
  const valid = codeStatus === 'valid';
  async function continueToPayment() {
    if (valid) persistRefCode(code.trim().toUpperCase()); else clearStoredRefCode();
    await startWithReferral(valid ? code.trim().toUpperCase() : '');
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm text-slate-950" aria-label="Suscripción TokXray Pro">
    <div className="flex items-center justify-between gap-3 mb-3"><BrandLogo tone="dark" size="sm" /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium">TokXray Pro</span></div>
    {isPro ? <div className="space-y-4 py-4"><h2 className="text-xl font-semibold">Tu acceso completo está activo</h2><p className="text-sm text-muted-foreground">Elige un producto, estudia un video y prepara tu siguiente guion.</p><Button asChild className="w-full h-11"><Link to="/app">Encontrar mi siguiente idea <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Link to="/settings" className="block text-center text-sm underline">Administrar mi cuenta</Link></div> : <>
      <SubscriptionPrice />
      <ul className="space-y-2 my-4 text-[13px] leading-5">
        {['Encuentra productos y videos con ventas reportadas.', 'Entiende el gancho, el guion y la estructura con IA.', 'Prepara tres variantes para grabar con tu estilo.'].map(text => <li className="flex gap-2" key={text}><Check aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />{text}</li>)}
      </ul>
      <details className="mb-3 text-xs" open={code ? true : undefined}>
        <summary className="cursor-pointer py-2 font-medium">{savedCode ? 'Tu código de creador registrado' : '¿Tienes un código de creador?'}</summary>
        <label className="sr-only" htmlFor="subscription-referral">Código de creador</label>
        <Input id="subscription-referral" value={code} disabled={savedCode} autoCapitalize="characters" maxLength={12} placeholder="Ej. LALO" className="h-10 mt-1" onChange={e => {setCode(e.target.value.toUpperCase()); setCodeStatus(e.target.value.trim() ? 'checking' : 'empty');}} />
        <p role="status" className={`mt-1 ${codeStatus === 'invalid' || codeStatus === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>{codeStatus === 'checking' ? 'Comprobando código…' : codeStatus === 'valid' ? 'Código reconocido. Se conservará al crear tu cuenta y al pagar.' : codeStatus === 'invalid' ? 'No encontramos ese código. Corrígelo o bórralo para continuar.' : codeStatus === 'error' ? 'No pudimos comprobar el código. Intenta de nuevo.' : 'El código reconoce al creador que te invitó. Tu precio sigue siendo US$29 al mes.'}</p>
      </details>
      <Button className="w-full h-11 rounded-xl text-sm bg-slate-950 hover:bg-slate-800 text-white" onClick={continueToPayment} disabled={loading || !authReady || accessLoading || ['checking','invalid','error'].includes(codeStatus)}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abriendo pago…</> : signedIn ? 'Continuar al pago seguro' : 'Crear cuenta y continuar'}{!loading && <ArrowRight className="ml-2 h-4 w-4" />}</Button>
      <p className="text-xs text-center text-muted-foreground mt-2">{signedIn ? 'Renovación mensual. Cancela desde Configuración.' : 'Crear tu cuenta no tiene costo. Pro se activa al pagar.'}</p>
      <div className="mt-3"><CurrencyDisclosure /></div>
    </>}
  </section>;
}
