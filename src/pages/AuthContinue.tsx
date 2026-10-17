import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authDestination } from "@/lib/auth-destination";
import { getStoredRefCode } from "@/lib/attribution";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";

export default function AuthContinue() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = authDestination(params.get("redirect"));
  const [status, setStatus] = useState<"loading" | "confirmation" | "error">("loading");
  const confirmationEmail = typeof location.state?.confirmationEmail === "string" ? location.state.confirmationEmail : null;
  const hashParams = new URLSearchParams(location.hash.slice(1));
  const redirectError = params.get("error") || hashParams.get("error");
  const hasRedirectError = !!(redirectError || params.get("error_code") || params.get("error_description") || hashParams.get("error_code") || hashParams.get("error_description"));
  useEffect(() => {
    let active = true;
    async function finish() {
      if (hasRedirectError) { setStatus("error"); return; }
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error) {
          setStatus(confirmationEmail && error.name === "AuthSessionMissingError" ? "confirmation" : "error");
          return;
        }
        if (!user) { setStatus(confirmationEmail ? "confirmation" : "error"); return; }
        if (!user.email_confirmed_at) { setStatus("confirmation"); return; }
        // Email confirmation may open on another device without the referral cookie.
        // The server still validates ownership, eligibility and existing attribution.
        const signupCode = user.user_metadata?.referral_code;
        const code = typeof signupCode === "string" && signupCode.trim()
          ? signupCode.trim()
          : getStoredRefCode();
        if (code) {
          try {
            const { error: referralError } = await supabase.rpc("apply_referral_code", { p_user_id: user.id, p_code: code });
            if (referralError) console.error("Referral will be revalidated at checkout", referralError.code);
          } catch {
            // Attribution is retried at checkout; it must not reject a valid login.
            console.error("Referral will be revalidated at checkout");
          }
        }
        if (active) navigate(destination, { replace: true });
      } catch {
        if (active) setStatus("error");
      }
    }
    void finish();
    return () => { active = false; };
  }, [destination, navigate, confirmationEmail, hasRedirectError]);
  return (
    <main className="min-h-[100dvh] landing-light flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm space-y-5">
        <Link to="/" className="inline-flex"><BrandLogo tone="dark" size="lg" /></Link>
        <div className="space-y-2">
          {destination === "/pricing" && status === "confirmation" && <p className="text-xs text-muted-foreground">Cuenta creada · Confirma tu correo · Después, activa Pro</p>}
          <h1 className="text-2xl font-semibold tracking-tight">{status === "confirmation" ? "Confirma tu correo para continuar" : status === "error" ? "No se completó el acceso" : "Ya casi estás dentro"}</h1>
          <p role="status" className="text-sm text-muted-foreground">
            {status === "confirmation" ? "Confirma tu correo e inicia sesión para continuar."
              : status === "error" ? redirectError === "access_denied" ? "El acceso se canceló. Puedes volver a entrar con Google o con tu correo."
              : "No pudimos verificar tu sesión. Vuelve a iniciar sesión para continuar."
              : "Preparando tu cuenta…"}
          </p>
        </div>
        {status === "confirmation" && <>
          <div className="rounded-xl bg-muted/50 p-4 text-left text-sm space-y-2">
            <p>Abre el mensaje de TokXray{confirmationEmail ? <> en <strong className="break-all">{confirmationEmail}</strong></> : " en el correo que usaste al registrarte"} y pulsa el enlace de confirmación.</p>
            <p className="text-xs text-muted-foreground">Si no lo ves, revisa spam o promociones. Con Google puedes continuar sin este paso adicional.</p>
          </div>
          <p className="text-sm">Después de confirmar, podrás explorar la vista previa. Con Pro podrás analizar una referencia y adaptar el guion a tu producto y a tu voz.</p>
          <p className="text-xs text-muted-foreground">Crear tu cuenta es gratis. Registrarte no inicia una suscripción ni genera cargos. Pro se activa al completar el pago.</p>
          <Button asChild className="w-full h-11"><Link to={`/login?redirect=${encodeURIComponent(destination)}`}>Ya confirmé, continuar</Link></Button>
          <Link className="inline-block text-xs text-muted-foreground underline" to="/app">Seguir explorando el catálogo</Link>
        </>}
        {status === "error" && <>
          <Button asChild className="w-full h-11"><Link to={`/login?redirect=${encodeURIComponent(destination)}`}>Volver a iniciar sesión</Link></Button>
          <Link className="inline-block text-xs text-muted-foreground underline" to="/app">Seguir explorando el catálogo</Link>
        </>}
      </section>
    </main>
  );
}
