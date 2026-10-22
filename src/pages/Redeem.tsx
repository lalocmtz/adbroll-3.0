import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useToast } from "@/hooks/use-toast";

export default function Redeem() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const returnTo = `/canjear?code=${encodeURIComponent(code)}`;
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setVerified(Boolean(data.user?.email_confirmed_at))); }, []);

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_creator_access', { p_code: code });
      if (error) throw error;
      const grant = data as { access_kind: string; subscription_ends_at: string | null };
      toast({ title: 'Acceso activado', description: grant.access_kind === 'lifetime' ? 'Tu acceso vitalicio está listo.' : `Acceso hasta ${new Date(grant.subscription_ends_at!).toLocaleDateString('es-MX')}.` });
      navigate('/app', { replace: true });
    } catch (error: any) {
      toast({ title: 'No se pudo activar', description: error.message || 'Revisa el código y usa el correo de tu solicitud.', variant: 'destructive' });
    } finally { setLoading(false); }
  }
  return <main className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md"><CardHeader className="text-center">
      <Link to="/" className="mx-auto mb-4"><BrandLogo tone="dark" size="lg" /></Link>
      <CardTitle>Activa tu acceso de creador</CardTitle><CardDescription>Entra con el correo verificado de tu solicitud aprobada y canjea tu código personal. Activarlo no genera cargos.</CardDescription>
    </CardHeader><CardContent className="space-y-4">
      <form onSubmit={redeem} className="space-y-4"><Label htmlFor="grant-code">Código de acceso</Label><Input id="grant-code" required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CREATOR-XXXXXX" />
        {verified ? <Button className="w-full" disabled={loading || !code.trim()}>{loading ? 'Activando…' : 'Canjear mi acceso'}</Button> : <>
          <Button className="w-full" asChild><Link to={`/login?redirect=${encodeURIComponent(returnTo)}`}>Iniciar sesión y activar</Link></Button>
          <Button className="w-full" variant="outline" asChild><Link to={`/register?redirect=${encodeURIComponent(returnTo)}`}>Crear cuenta y confirmar correo</Link></Button>
        </>}
      </form>
      <p className="text-xs text-muted-foreground">Si tu acceso vitalicio ya fue aprobado, puedes entrar directamente. <Link to="/colaboraciones" className="underline">Consultar solicitud</Link></p>
    </CardContent></Card>
  </main>;
}
