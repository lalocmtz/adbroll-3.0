import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStartCheckout } from "@/lib/checkout";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface SimpleEmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  // Kept for backwards compat with existing call sites (Unlock.tsx, etc.).
  // The modal no longer captures email — it is a one-screen mini-offer that
  // sends the user straight to Stripe — so these are effectively no-ops.
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
}

const BULLETS = [
  "Videos que más venden en TikTok Shop, actualizados a diario",
  "Guiones reales extraídos por IA + variantes ilimitadas",
  "Oportunidades de productos y panel de afiliados (30%)",
];

/**
 * Mini-offer modal. A single screen — no email step — that sends the visitor
 * directly to Stripe Checkout (Stripe collects email + card). Used by
 * `openPaywall` from anywhere in the app.
 */
export const SimpleEmailCaptureModal = ({
  open,
  onOpenChange,
}: SimpleEmailCaptureModalProps) => {
  const navigate = useNavigate();
  const { start: startCheckout, loading } = useStartCheckout();

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
            <BrandLogo tone="dark" size="lg" />
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Desbloquea TokXray
            </h2>
            <p className="text-sm text-muted-foreground">
              Todo lo que necesitas para vender en TikTok Shop
            </p>
          </div>

          {/* Bullets */}
          <ul className="space-y-3 mb-5 text-sm">
            {BULLETS.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="text-center mb-5">
            <span className="text-4xl font-bold text-primary">$24.99</span>
            <span className="text-muted-foreground text-base">/mes</span>
            <p className="text-xs text-muted-foreground mt-1">
              Cancela cuando quieras · Pago seguro con Stripe
            </p>
          </div>

          {/* CTA → Stripe */}
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={startCheckout}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Empezar ahora → Stripe
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

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
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
