import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Gift } from "lucide-react";
import { registerSchema } from "@/lib/validations";

const Register = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate referral code on change
  useEffect(() => {
    const validateCode = async () => {
      if (!referralCode || referralCode.length < 4) {
        setReferralValid(null);
        return;
      }

      const { data } = await supabase
        .from("affiliate_codes")
        .select("id")
        .eq("code", referralCode.toUpperCase())
        .maybeSingle();

      setReferralValid(!!data);
    };

    const timeout = setTimeout(validateCode, 500);
    return () => clearTimeout(timeout);
  }, [referralCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: result.data.fullName,
          },
        },
      });

      if (error) throw error;

      // If referral code is valid, apply it
      if (referralCode && referralValid && signUpData.user) {
        await supabase.rpc("apply_referral_code", {
          p_user_id: signUpData.user.id,
          p_code: referralCode,
        });
      }

      toast({
        title: "¡Cuenta creada!",
        description: referralValid
          ? "Descuento de 50% aplicado al primer mes 🎉"
          : "Redirigiendo a los planes...",
      });

      // Redirect to pricing page with referral code if valid
      const redirect = searchParams.get("redirect");
      if (redirect) {
        setTimeout(() => navigate(redirect), 1000);
      } else {
        const refParam = referralCode && referralValid ? `?ref=${referralCode}` : "";
        setTimeout(() => navigate(`/pricing${refParam}`), 1000);
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message?.includes("already registered")) {
        message = "Este email ya está registrado. ¿Quieres iniciar sesión?";
      }
      toast({
        title: "Error al registrarse",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    
    // Store referral code in localStorage to apply after OAuth redirect
    if (referralCode && referralValid) {
      localStorage.setItem("pending_referral_code", referralCode.toUpperCase());
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error con Google",
        description: error.message,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center landing-light p-4">
      <Card className="w-full max-w-md card-landing-light">
        <CardHeader>
          <div className="text-center mb-4">
            <img 
              src="/src/assets/logo-dark.png"
              alt="adbroll"
              className="h-12 mx-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            />
          </div>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Accede a los videos más rentables de TikTok Shop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Code Input - Before OAuth for visibility */}
          <div className="space-y-2">
            <Label htmlFor="referralCode" className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Código de referido (opcional)
            </Label>
            <Input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className={`${
                referralValid === true
                  ? "border-green-500 focus-visible:ring-green-500"
                  : referralValid === false
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {referralValid === true && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                🎉 Código válido - ¡50% off en tu primer mes!
              </p>
            )}
            {referralValid === false && (
              <p className="text-sm text-red-500">
                Código no válido
              </p>
            )}
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-3"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                o con email
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
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
                Mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial
              </p>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary-hover" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta gratuita"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
