import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { registerSchema } from "@/lib/validations";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PasswordRecovery({ update = false }: { update?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(!update);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!update) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setReady(!!data.session && !error);
      if (!data.session || error) setError("El enlace venció o no es válido. Solicita uno nuevo.");
    });
    return () => { active = false; };
  }, [update]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (update) {
      const validation = registerSchema.shape.password.safeParse(password);
      if (!validation.success) { setError(validation.error.errors[0].message); return; }
      if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
      if (!ready) return;
    } else {
      const validation = registerSchema.shape.email.safeParse(email);
      if (!validation.success) { setError(validation.error.errors[0].message); return; }
    }
    setBusy(true);
    try {
      if (update) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword(""); setConfirmation("");
        await supabase.auth.signOut({ scope: "local" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/actualizar-contrasena`,
        });
        if (error) throw error;
      }
      setDone(true);
    } catch {
      setError(update ? "No pudimos actualizar tu contraseña. Solicita un enlace nuevo e inténtalo de nuevo." : "No pudimos enviar el enlace. Espera unos minutos e inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center landing-light p-4">
    <Card className="w-full max-w-md card-landing-light">
      <CardHeader className="space-y-5"><Link to="/" aria-label="TokXray, inicio"><BrandLogo tone="dark" size="lg" /></Link><CardTitle>{update ? "Crea una nueva contraseña" : "Recupera tu cuenta"}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {done ? <p role="status">{update ? "Tu contraseña quedó actualizada. Inicia sesión para continuar." : "Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de spam."}</p> : <form onSubmit={submit} className="space-y-4">
          {update ? <><Label htmlFor="new-password">Nueva contraseña</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={!ready} /><p className="text-xs text-muted-foreground">Mínimo 8 caracteres, mayúscula, minúscula, número y símbolo.</p><Label htmlFor="confirm-password">Repite la contraseña</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required disabled={!ready} /></> : <><p className="text-sm text-muted-foreground">Escribe el correo de tu cuenta para solicitar un enlace de recuperación.</p><Label htmlFor="recovery-email">Correo electrónico</Label><Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !ready}>{busy ? "Un momento…" : update ? "Guardar contraseña" : "Enviar enlace de recuperación"}</Button>
        </form>}
        {update && !done && <Link className="block text-sm text-primary underline" to="/recuperar-cuenta">Solicitar otro enlace</Link>}
        <Link className="block text-sm text-primary underline" to="/login">Volver a iniciar sesión</Link>
      </CardContent>
    </Card>
  </main>;
}
