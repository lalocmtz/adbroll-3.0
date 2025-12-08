import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Tag, Check, X } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Ingresa un email válido" });

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode?: string | null;
}

export const EmailCaptureModal = ({ open, onOpenChange, referralCode: initialReferralCode }: EmailCaptureModalProps) => {
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Referral code validation state
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeError, setCodeError] = useState("");

  // Pre-fill referral code if passed
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      validateReferralCode(initialReferralCode);
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

  const getButtonText = () => {
    if (loading) return "Procesando...";
    if (codeValid) return "Continuar — $14.50 USD";
    return "Continuar — $29 USD";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            Empieza con AdBroll
          </DialogTitle>
          <p className="text-center text-zinc-400 mt-2">
            Ingresa tu correo para continuar con tu suscripción.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300 text-sm">
              Correo electrónico
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
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-lg"
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Referral code field */}
          <div className="space-y-2">
            <Label htmlFor="referral" className="text-zinc-300 text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" />
              ¿Tienes código de descuento? <span className="text-zinc-500">(opcional)</span>
            </Label>
            <div className="relative">
              <Input
                id="referral"
                type="text"
                placeholder="Ej: ABC123"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                }}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-lg uppercase pr-12"
                disabled={loading}
              />
              {/* Validation indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validatingCode && (
                  <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                )}
                {!validatingCode && codeValid === true && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {!validatingCode && codeValid === false && referralCode.trim() && (
                  <X className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
            {/* Validation message */}
            {codeValid === true && (
              <p className="text-sm text-green-400 flex items-center gap-1">
                <Check className="h-4 w-4" />
                ¡Código válido! Tu primer mes será $14.50 USD
              </p>
            )}
            {codeError && referralCode.trim() && (
              <p className="text-sm text-red-400">{codeError}</p>
            )}
          </div>

          {/* Price indicator */}
          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total a pagar hoy:</span>
              {codeValid ? (
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-400">$14.50 USD</span>
                  <p className="text-xs text-zinc-500">
                    <span className="line-through">$29 USD</span> — 50% off primer mes
                  </p>
                </div>
              ) : (
                <span className="text-2xl font-bold text-white">$29 USD</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              Después: $29 USD/mes. Cancela cuando quieras.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent border-zinc-700 text-white hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
