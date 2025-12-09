import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      setPasswordSubtitle: "Crea una contraseña para acceder a tu cuenta",
      emailLabel: "Email",
      passwordLabel: "Contraseña",
      confirmPasswordLabel: "Confirmar contraseña",
      createAccountBtn: "Crear cuenta y entrar",
      orText: "o",
      magicLinkBtn: "Enviar link mágico al email",
      checkEmailTitle: "Revisa tu email",
      checkEmailSubtitle: "Te enviamos un link para confirmar tu cuenta",
      checkEmailNote: "Haz clic en el link que enviamos a",
      alreadyLoggedTitle: "¡Ya tienes sesión!",
      alreadyLoggedSubtitle: "Redirigiendo al dashboard...",
      goToDashboard: "Ir al Dashboard",
    },
    en: {
      successTitle: "Payment successful!",
      successSubtitle: "Your Adbroll Pro subscription is active",
      setPasswordTitle: "Set up your account",
      setPasswordSubtitle: "Create a password to access your account",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      createAccountBtn: "Create account and enter",
      orText: "or",
      magicLinkBtn: "Send magic link to email",
      checkEmailTitle: "Check your email",
      checkEmailSubtitle: "We sent you a link to confirm your account",
      checkEmailNote: "Click the link we sent to",
      alreadyLoggedTitle: "Already logged in!",
      alreadyLoggedSubtitle: "Redirecting to dashboard...",
      goToDashboard: "Go to Dashboard",
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t.orText}</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleMagicLink} 
            className="w-full"
            disabled={isSubmitting}
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