import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBlurGate } from "@/hooks/useBlurGate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackInitiateCheckout, trackAddPaymentInfo } from "@/lib/analytics";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_FEATURES = [
  { text: "Los 20 videos que más venden hoy" },
  { text: "Guión en 3 versiones, listo para copiar" },
  { text: "Métricas reales: ingresos, ventas, ROAS" },
  { text: "Cancela en 1 clic" },
];

export const PaywallModal = ({ open, onClose }: PaywallModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoggedIn, session } = useBlurGate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: "pro") => {
    // Reached checkout + real payment intent — give Meta both signals.
    trackInitiateCheckout(24.99, "USD", "TokXray Pro");
    trackAddPaymentInfo(24.99, "USD", "TokXray Pro");

    if (!isLoggedIn) {
      navigate(`/register?plan=${plan}`);
      onClose();
      return;
    }

    setLoadingPlan(plan);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code_used")
        .eq("id", session?.user?.id)
        .single();

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: profile?.referral_code_used, plan },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso de pago. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10"
          >
            <Lock className="w-6 h-6 text-primary" />
          </motion.div>
          <DialogTitle className="text-center text-xl">
            Desbloquea el Top 20 completo
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            Estás viendo solo 5. Los otros 15 —con su guión listo para copiar— están a un clic.
          </p>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center text-xs text-muted-foreground mb-4">
            Cada día sin verlos es otro día grabando a ciegas.
          </p>

          <Card className="p-5 border-2 border-primary relative">
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] whitespace-nowrap">
              50% OFF el primer mes · primeros 100
            </Badge>

            <div className="text-center mb-4 pt-2">
              <div className="text-3xl font-bold mt-1">$24.99<span className="text-sm font-normal text-muted-foreground"> USD/mes</span></div>
            </div>

            <ul className="space-y-2 mb-4">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSelectPlan("pro")}
              className="w-full"
              disabled={loadingPlan === "pro"}
            >
              {loadingPlan === "pro" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : "Desbloquear ahora"}
            </Button>
          </Card>

          <Button variant="ghost" onClick={onClose} className="w-full mt-4 text-muted-foreground">
            Seguir explorando
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Sin permanencia. Cancelas cuando quieras.
          </p>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Al continuar, aceptas nuestros{" "}
            <a href="/terms" className="text-primary hover:underline">Términos</a>
            {" "}y{" "}
            <a href="/refund-policy" className="text-primary hover:underline">Política de Reembolsos</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
