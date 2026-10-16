import { isReferralCode, normalizeReferralCode } from "@/lib/referral-code";
import { authDestination, authCallbackUrl } from "@/lib/auth-destination";
import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Mail, X } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { trackSignUp } from "@/lib/analytics";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { clearStoredRefCode, getStoredRefCode, persistRefCode } from "@/lib/attribution";

const Register = () => {
  const [searchParams] = useSearchParams();
  const destination = authDestination(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || getStoredRefCode() || "");
  const [referralCheck, setReferralCheck] = useState<{ code: string; status: "valid" | "invalid" | "error" } | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const normalizedCode = normalizeReferralCode(referralCode);
  const referralStatus = !normalizedCode ? "empty"
    : !isReferralCode(normalizedCode) ? "invalid"
    : referralCheck?.code === normalizedCode ? referralCheck.status : "pending";
  const referralValid = referralStatus === "valid";
  const referralBlocked = referralStatus !== "empty" && !referralValid;
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate(`/auth/continue?redirect=${encodeURIComponent(destination)}`, { replace: true });
    }).catch(() => { /* A failed session check must not prevent registration. */ });
    return () => { active = false; };
  }, [destination, navigate]);

  useEffect(() => {
    let active = true;
    if (!isReferralCode(normalizedCode)) return;
    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("validate_referral_code", { p_code: normalizedCode });
        if (active) setReferralCheck({ code: normalizedCode, status: error ? "error" : data ? "valid" : "invalid" });
      } catch {
        if (active) setReferralCheck({ code: normalizedCode, status: "error" });
      }
    }, 350);
    return () => { active = false; clearTimeout(timeout); };
  }, [normalizedCode]);

  const canContinue = () => {
    if (!referralBlocked) return true;
    toast({ title: "Revisa tu código", description: referralStatus === "pending"
      ? "Estamos verificándolo. Espera un momento para registrar quién te invitó."
      : "Corrige el código o déjalo vacío para continuar sin él.", variant: "destructive" });
    return false;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!canContinue()) return;

    // Validate inputs
    const result = registerSchema.safeParse({ fullName, email, password, referralCode });
    if (!result.success) {
      const fieldErrors: { fullName?: string; email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (field === 'fullName') fieldErrors.fullName = err.message;
        if (field === 'email') fieldErrors.email = err.message;
        if (field === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    if (referralValid) persistRefCode(normalizedCode);
    else clearStoredRefCode();

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: authCallbackUrl(destination),
          data: {
            full_name: result.data.fullName,
            referral_code: referralValid ? normalizedCode : null,
          },
        },
      });

      if (error) throw error;

      // If referral code is valid, apply it
      if (referralCode && referralValid && signUpData.session && signUpData.user) {
        await supabase.rpc("apply_referral_code", {
          p_user_id: signUpData.user.id,
          p_code: normalizedCode,
        });
      }

      // Promotional access is redeemed separately after email verification.
      // Registration must never insert its own active subscription.
      // Track CompleteRegistration event for Meta Pixel
      trackSignUp("email", result.data.email);

      toast({
        title: "¡Cuenta creada!",
        description: signUpData.session
          ? "Tu cuenta está lista. Ya puedes continuar."
          : "Revisa tu correo y confirma tu cuenta para continuar.",
      });

      // Continue after confirmation while preserving the requested destination
      navigate(`/auth/continue?redirect=${encodeURIComponent(destination)}`, { state: { confirmationEmail: result.data.email } });
    } catch (error: any) {
      let message = error.message;
      if (error.message?.includes("already registered")) {
        message = "Este correo ya está registrado. Inicia sesión con tu cuenta.";
      }
      toast({
        title: "No pudimos crear tu cuenta",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!canContinue()) return;
    setIsGoogleLoading(true);
    
    // Store referral code in localStorage to apply after OAuth redirect
    if (referralValid) persistRefCode(normalizedCode);
    else clearStoredRefCode();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl(destination),
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "No pudimos conectar con Google",
        description: error.message,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-start sm:items-center justify-center bg-brand-ink px-4 py-5">
      <Card className="w-full max-w-md card-landing-light relative border-white/10 shadow-2xl">
        <button
          onClick={() => navigate("/app")}
          className="absolute top-2 right-2 h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors z-10"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <CardHeader className="px-5 pt-5 pb-3">
          <div className="text-center mb-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mx-auto block cursor-pointer transition-opacity hover:opacity-80"
            >
              <BrandLogo tone="dark" size="lg" />
            </button>
          </div>
          {destination === "/pricing" && <p className="text-[11px] text-muted-foreground">1. Cuenta · 2. Confirmación · 3. Activar Pro</p>}
          <h1 className="text-xl font-semibold leading-snug">Deja de grabar a ciegas.</h1>
          <CardDescription>
            Encuentra productos con ventas y videos de los que puedes aprender. Empieza a elegir con más intención.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Vista previa gratis, sin tarjeta. Explora primero. Activa guiones y análisis con Pro por US$15/mes cuando tú decidas. <Link to="/pricing" className="text-primary underline">Ver qué incluye Pro</Link>
          </p>
          {/* Referral Code Input - Before OAuth for visibility */}
          <div className="space-y-2">
            <Label htmlFor="referralCode" className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Código del creador (opcional)
            </Label>
            <Input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Ej. LALO"
              maxLength={32}
              autoComplete="off"
              disabled={isLoading || isGoogleLoading}
              aria-describedby="referral-status"
              aria-invalid={referralStatus === "invalid"}
              className={`${
                referralValid === true
                  ? "border-green-500 focus-visible:ring-green-500"
                  : referralStatus === "invalid"
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            <div id="referral-status" aria-live="polite" className="text-xs">
              {referralStatus === "valid" && <p className="text-green-700">Código válido: queda registrado quién te invitó. Pro cuesta US$15/mes; el código no cambia el precio.</p>}
              {referralStatus === "pending" && <p className="text-muted-foreground">Verificando tu código…</p>}
              {referralStatus === "invalid" && <p className="text-destructive">Código no válido. Corrígelo o déjalo vacío.</p>}
              {referralStatus === "error" && <p className="text-destructive">No pudimos verificarlo. Vuelve a escribirlo o déjalo vacío.</p>}
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full flex items-center justify-center gap-3"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading || referralBlocked}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? "Conectando..." : "Continuar con Google"}
          </Button>

          <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={() => setShowEmail(!showEmail)} aria-expanded={showEmail} aria-controls="email-registration" disabled={isLoading || isGoogleLoading}>
            <Mail className="h-4 w-4" /> {showEmail ? "Ocultar formulario de correo" : "Continuar con correo"}
          </Button>

          {showEmail && <form id="email-registration" onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                }}
                placeholder="Tu nombre"
                className={errors.fullName ? "border-destructive" : ""}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="tu@email.com"
                className={errors.email ? "border-destructive" : ""}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={errors.password ? "border-destructive" : ""}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                8+ caracteres con mayúscula, minúscula, número y símbolo.
              </p>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold bg-brand-pink hover:bg-brand-pink/90 text-white" disabled={isLoading || isGoogleLoading || referralBlocked}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta gratis"}
            </Button>
          </form>}
            <p className="text-[11px] leading-relaxed text-muted-foreground text-center">Al crear tu cuenta aceptas los <Link to="/terms" className="underline">términos de uso</Link> y la <Link to="/privacy" className="underline">política de privacidad</Link>. Consulta las <Link to="/terminos-afiliados" className="underline">condiciones del programa de afiliados</Link>.</p>
            <p className="text-xs text-center text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to={`/login?redirect=${encodeURIComponent(destination)}`} className="text-primary font-medium hover:underline">
                Inicia sesión
              </Link>
            </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
