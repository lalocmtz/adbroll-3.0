import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [step, setStep] = useState<"loading" | "set-password" | "check-email" | "already-logged">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setStep("already-logged");
      // Redirect after 3 seconds
      setTimeout(() => navigate("/app"), 3000);
      return;
    }

    // Check for stored email from guest checkout
    const storedEmail = localStorage.getItem("adbroll_checkout_email");
    if (storedEmail) {
      setEmail(storedEmail);
      setStep("set-password");
      localStorage.removeItem("adbroll_checkout_email");
    } else {
      // If no email stored, show email input
      setStep("set-password");
    }
  };

  const handleSetPassword = async () => {
    if (!email) {
      toast.error(language === "es" ? "Ingresa tu email" : "Enter your email");
      return;
    }
    
    if (password.length < 6) {
      toast.error(language === "es" ? "La contraseña debe tener al menos 6 caracteres" : "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error(language === "es" ? "Las contraseñas no coinciden" : "Passwords don't match");
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to sign in first (in case account already exists with temp password from webhook)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        toast.success(language === "es" ? "¡Sesión iniciada!" : "Logged in!");
        navigate("/app");
        return;
      }

      // If sign in failed, try to update password (user may have been created by webhook)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });

      if (resetError) {
        // Try signing up as fallback
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });

        if (signUpError) {
          throw signUpError;
        }
      }

      setStep("check-email");
      toast.success(language === "es" ? "Revisa tu email para confirmar" : "Check your email to confirm");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || (language === "es" ? "Error al configurar cuenta" : "Error setting up account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign in error:", error);
      toast.error(error.message || (language === "es" ? "Error al iniciar con Google" : "Error signing in with Google"));
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error(language === "es" ? "Ingresa tu email" : "Enter your email");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;

      setStep("check-email");
      toast.success(language === "es" ? "¡Link enviado! Revisa tu email" : "Link sent! Check your email");
    } catch (error: any) {
      console.error("Magic link error:", error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = {
    es: {
      successTitle: "¡Pago exitoso!",
      successSubtitle: "Tu suscripción a Adbroll Pro está activa",
      setPasswordTitle: "Configura tu cuenta",
      setPasswordSubtitle: "Elige cómo quieres acceder",
      emailLabel: "Email",
      passwordLabel: "Contraseña",
      confirmPasswordLabel: "Confirmar contraseña",
      createAccountBtn: "Crear cuenta y entrar",
      orText: "o",
      googleBtn: "Continuar con Google",
      magicLinkBtn: "Enviar link mágico al email",
      checkEmailTitle: "Revisa tu email",
      checkEmailSubtitle: "Te enviamos un link para confirmar tu cuenta",
      checkEmailNote: "Haz clic en el link que enviamos a",
      alreadyLoggedTitle: "¡Ya tienes sesión!",
      alreadyLoggedSubtitle: "Redirigiendo al dashboard...",
      goToDashboard: "Ir al Dashboard",
      fastestOption: "Más rápido",
    },
    en: {
      successTitle: "Payment successful!",
      successSubtitle: "Your Adbroll Pro subscription is active",
      setPasswordTitle: "Set up your account",
      setPasswordSubtitle: "Choose how you want to access",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      createAccountBtn: "Create account and enter",
      orText: "or",
      googleBtn: "Continue with Google",
      magicLinkBtn: "Send magic link to email",
      checkEmailTitle: "Check your email",
      checkEmailSubtitle: "We sent you a link to confirm your account",
      checkEmailNote: "Click the link we sent to",
      alreadyLoggedTitle: "Already logged in!",
      alreadyLoggedSubtitle: "Redirecting to dashboard...",
      goToDashboard: "Go to Dashboard",
      fastestOption: "Fastest",
    },
  };

  const t = content[language as keyof typeof content] || content.es;

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "already-logged") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{t.successTitle}</h1>
            <p className="text-lg font-medium text-primary">{t.successSubtitle}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.alreadyLoggedSubtitle}</span>
          </div>

          <Button onClick={() => navigate("/app")} className="w-full" size="lg">
            {t.goToDashboard}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "check-email") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{t.checkEmailTitle}</h1>
            <p className="text-muted-foreground">{t.checkEmailSubtitle}</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{t.checkEmailNote}</p>
            <p className="font-medium text-foreground">{email}</p>
          </div>
        </div>
      </div>
    );
  }

  // step === "set-password"
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.successTitle}</h1>
          <p className="text-lg font-medium text-primary">{t.successSubtitle}</p>
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold">{t.setPasswordTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.setPasswordSubtitle}</p>
          </div>

          {/* Google Sign In - Prominent option */}
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn} 
              className="w-full h-12 text-base font-medium"
              disabled={isSubmitting}
            >
              <GoogleIcon />
              <span className="ml-2">{t.googleBtn}</span>
            </Button>
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {t.fastestOption}
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t.orText}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t.emailLabel}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.passwordLabel}</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.confirmPasswordLabel}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            onClick={handleSetPassword} 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            {t.createAccountBtn}
          </Button>

          <Button 
            variant="ghost" 
            onClick={handleMagicLink} 
            className="w-full text-muted-foreground"
            disabled={isSubmitting || !email}
          >
            <Mail className="w-4 h-4 mr-2" />
            {t.magicLinkBtn}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;