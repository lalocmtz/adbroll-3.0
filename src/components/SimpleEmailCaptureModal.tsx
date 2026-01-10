import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import logoDark from "@/assets/logo-dark.png";

const emailSchema = z.string().email("Ingresa un email válido");

interface SimpleEmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  onSuccess?: () => void; // Optional callback when email is captured
  redirectOnSuccess?: boolean; // Whether to redirect to /unlock#pricing (default: true)
}

export const SimpleEmailCaptureModal = ({
  open,
  onOpenChange,
  feature,
  onSuccess,
  redirectOnSuccess = true,
}: SimpleEmailCaptureModalProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Get referral code from localStorage
      const referralCode = localStorage.getItem("adbroll_ref_code") || null;

      // Save email to database
      const { error: dbError } = await supabase.from("email_captures").insert({
        email: email.trim().toLowerCase(),
        referral_code: referralCode,
        source: feature ? `blur_gate_${feature}` : "blur_gate",
      });

      if (dbError && !dbError.message.includes("duplicate")) {
        console.error("Error saving email:", dbError);
      }

      // Save email to localStorage for checkout pre-fill
      localStorage.setItem("adbroll_prospect_email", email.trim().toLowerCase());

      // If there's a success callback, call it instead of redirecting
      if (onSuccess) {
        onSuccess();
        return;
      }

      // Default behavior: close modal and navigate to unlock with pricing anchor
      if (redirectOnSuccess) {
        onOpenChange(false);
        navigate("/unlock#pricing");
        toast.success("¡Listo! Elige tu plan para continuar");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 sm:p-8"
        >
          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img src={logoDark} alt="Adbroll" className="h-8 sm:h-10" />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Desbloquea Adbroll
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Ingresa tu email para ver los planes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className={`pl-10 h-12 text-base ${
                  error ? "border-destructive" : ""
                }`}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Ver planes y precios
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/login");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ¿Ya tienes cuenta?{" "}
              <span className="font-medium text-primary hover:underline">
                Iniciar sesión
              </span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Al continuar, aceptas nuestros{" "}
            <a href="/terms" className="underline hover:text-foreground">
              términos
            </a>{" "}
            y{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              privacidad
            </a>
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
