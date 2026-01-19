import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  fullName: string;
  onSuccess: (userId: string) => void;
}

const QuickSignupModal = ({
  open,
  onOpenChange,
  email,
  fullName,
  onSuccess,
}: QuickSignupModalProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    if (password.length < 6) {
      setError(
        language === "es"
          ? "La contraseña debe tener al menos 6 caracteres"
          : "Password must be at least 6 characters"
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          // Try to sign in instead
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(
              language === "es"
                ? "Este email ya tiene cuenta. ¿Contraseña incorrecta?"
                : "This email already has an account. Wrong password?"
            );
            return;
          }

          if (signInData.user) {
            onSuccess(signInData.user.id);
            return;
          }
        }
        throw signUpError;
      }

      if (data.user) {
        onSuccess(data.user.id);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: language === "es" ? "Error" : "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // Store pending application data in localStorage for after OAuth redirect
      localStorage.setItem("pendingCreatorApplication", "true");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/talento?tab=apply`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    // Store pending application data
    localStorage.setItem("pendingCreatorApplication", "true");
    window.location.href = `/login?redirect=${encodeURIComponent("/talento?tab=apply")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {language === "es" ? "Crea tu cuenta para enviar" : "Create your account to submit"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {language === "es"
              ? "Es gratis • Solo toma 10 segundos"
              : "It's free • Only takes 10 seconds"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email (pre-filled and disabled) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {language === "es" ? "Contraseña" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSignup()}
            />
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Mínimo 6 caracteres" : "Minimum 6 characters"}
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSignup}
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "es" ? "Creando cuenta..." : "Creating account..."}
              </>
            ) : (
              <>{language === "es" ? "Crear cuenta y enviar" : "Create account & submit"}</>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {language === "es" ? "o continuar con" : "or continue with"}
              </span>
            </div>
          </div>

          {/* Google Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            {language === "es" ? "¿Ya tienes cuenta?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={handleLoginRedirect}
              className="text-primary hover:underline font-medium"
            >
              {language === "es" ? "Inicia sesión" : "Log in"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSignupModal;
