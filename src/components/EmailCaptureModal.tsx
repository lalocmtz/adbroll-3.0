import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Tag, Check, X } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Ingresa un email válido" });

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode?: string | null;
}

export const EmailCaptureModal = ({ open, onOpenChange, referralCode: initialReferralCode }: EmailCaptureModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Get referral code from props, URL params, or localStorage
  const getInitialReferralCode = () => {
    if (initialReferralCode) return initialReferralCode.toUpperCase();
    const storedCode = localStorage.getItem("adbroll_ref_code");
    if (storedCode) return storedCode.toUpperCase();
    return "";
  };
  
  const [referralCode, setReferralCode] = useState(getInitialReferralCode);
  
  // Referral code validation state
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeError, setCodeError] = useState("");

  // Re-initialize referral code when modal opens (to pick up localStorage changes)
  useEffect(() => {
    if (open) {
      const code = getInitialReferralCode();
      if (code && code !== referralCode) {
        setReferralCode(code);
        validateReferralCode(code);
      }
    }
  }, [open]);

  // Pre-fill referral code if passed as prop
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode.toUpperCase());
      validateReferralCode(initialReferralCode.toUpperCase());
    }
  }, [initialReferralCode]);

  // Debounced validation for referral code
  useEffect(() => {
    if (!referralCode.trim()) {
      setCodeValid(null);
      setCodeError("");
      return;
    }

    const timer = setTimeout(() => {
      validateReferralCode(referralCode.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [referralCode]);

  const validateReferralCode = async (code: string) => {
    if (!code) return;
    
    setValidatingCode(true);
    setCodeError("");
    
    try {
      const { data, error } = await supabase
        .from("affiliate_codes")
        .select("code")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error("Error validating code:", error);
        setCodeValid(false);
        setCodeError("Error al validar el código");
        return;
      }

      if (data) {
        setCodeValid(true);
        setCodeError("");
      } else {
        setCodeValid(false);
        setCodeError("Código no válido");
      }
    } catch (err) {
      console.error("Error validating referral code:", err);
      setCodeValid(false);
      setCodeError("Error al validar");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate email
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Call edge function to create checkout session for guest
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout-guest", {
        body: { 
          email: email.trim(),
          referral_code: codeValid ? referralCode.trim().toUpperCase() : null
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No se pudo crear la sesión de pago");
      }
    } catch (err: any) {
      console.error("Error creating checkout:", err);
      toast.error("Error al procesar. Intenta de nuevo.");
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-foreground">
            Tu próximo video viral te espera
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Únete a cientos de creadores que ya están ganando con TikTok Shop
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground text-sm font-medium">
              Tu correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="h-12 text-base"
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Referral code field */}
          <div className="space-y-2">
            <Label htmlFor="referral" className="text-foreground text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              ¿Tienes código de descuento?
            </Label>
            <div className="relative">
              <Input
                id="referral"
                type="text"
                placeholder="Código (opcional)"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                }}
                className="h-12 text-base uppercase pr-12"
                disabled={loading}
              />
              {/* Validation indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validatingCode && (
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                )}
                {!validatingCode && codeValid === true && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {!validatingCode && codeValid === false && referralCode.trim() && (
                  <X className="h-5 w-5 text-destructive" />
                )}
              </div>
            </div>
            {/* Validation message */}
            {codeValid === true && (
              <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                <Check className="h-4 w-4" />
                ¡Código aplicado! 50% off en tu primer mes
              </p>
            )}
            {codeError && referralCode.trim() && (
              <p className="text-sm text-destructive">{codeError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Continuar
              </>
            )}
          </Button>

          {/* Subscription Note */}
          <p className="text-xs text-muted-foreground text-center mb-2">
            Esta es una suscripción mensual de $29 USD. Puedes cancelarla cuando quieras desde Configuración.
          </p>
          
          {/* Policy Links */}
          <p className="text-xs text-muted-foreground text-center">
            Al continuar, aceptas nuestros{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Términos y Condiciones
            </a>
            {" "}y{" "}
            <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Política de Reembolsos
            </a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
