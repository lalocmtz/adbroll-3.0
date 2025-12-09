import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Tag, Check, X, TrendingUp, FileText, Wand2, ShoppingBag, Zap } from "lucide-react";
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
        // Store email for post-checkout account setup
        localStorage.setItem("adbroll_checkout_email", email.trim());
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

  const benefits = [
    { icon: TrendingUp, text: "Videos virales que generan ventas" },
    { icon: FileText, text: "Guiones listos para copiar" },
    { icon: Wand2, text: "Variantes IA personalizadas" },
    { icon: ShoppingBag, text: "Productos con alta comisión" },
    { icon: Zap, text: "Actualizaciones diarias" },
  ];

  const displayPrice = codeValid ? "$14.50" : "$29";
  const originalPrice = codeValid ? "$29" : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border text-foreground p-0 overflow-hidden">
        <AnimatePresence>
          {/* Premium Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4"
          >
            <DialogHeader className="space-y-3">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
                className="flex items-center justify-center"
              >
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
              </motion.div>
              <DialogTitle className="text-center text-xl font-bold text-foreground leading-tight">
                🔓 Desbloquea TODO el poder de AdBroll
              </DialogTitle>
              <p className="text-center text-sm text-muted-foreground">
                Únete a +1,000 creadores que ya ganan con TikTok Shop
              </p>
            </DialogHeader>
          </motion.div>

          {/* Benefits List */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="px-6 py-4 space-y-2.5 bg-muted/30"
          >
            {benefits.map((benefit, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm text-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Form */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          onSubmit={handleSubmit} 
          className="px-6 pb-6 pt-4 space-y-4"
        >
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
              className="h-12 text-base border-2 focus:border-primary"
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
                className="h-12 text-base uppercase pr-12 border-2"
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

          {/* Price Display */}
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-2xl font-bold text-foreground">{displayPrice}</span>
            <span className="text-sm text-muted-foreground">/mes</span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through ml-1">{originalPrice}</span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl shadow-lg"
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
                Activar AdBroll Pro
              </>
            )}
          </Button>

          {/* Subscription Note */}
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Suscripción mensual. Cancela cuando quieras desde tu panel.
          </p>
          
          {/* Policy Links */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[11px] text-muted-foreground text-center"
          >
            Al continuar aceptas{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Términos
            </a>
            {" "}y{" "}
            <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Reembolsos
            </a>
          </motion.p>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
};