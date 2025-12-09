import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Lock, Sparkles, TrendingUp, Video, Wand2, Globe, Calendar, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBlurGate } from "@/hooks/useBlurGate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const FEATURES = [
  { icon: Globe, text: "Acceso a todos los países" },
  { icon: Video, text: "Espiar videos que venden hoy" },
  { icon: Wand2, text: "Ver scripts reales de creadores" },
  { icon: Sparkles, text: "IA para replicar guiones ganadores" },
  { icon: TrendingUp, text: "Descubrir oportunidades calientes" },
  { icon: Calendar, text: "Actualizaciones diarias" },
];

export const PaywallModal = ({ open, onClose, feature }: PaywallModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoggedIn, session } = useBlurGate();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!isLoggedIn) {
      navigate("/register");
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Get referral code if user has one
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code_used")
        .eq("id", session?.user?.id)
        .single();

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: profile?.referral_code_used },
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
      setLoading(false);
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
            {feature ? `Desbloquea "${feature}"` : "Desbloquea todo Adbroll"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="text-3xl font-bold text-foreground">$29<span className="text-lg font-normal text-muted-foreground">/mes</span></div>
            <p className="text-sm text-muted-foreground mt-1">Cancela cuando quieras</p>
          </motion.div>

          <ul className="space-y-3 mb-4">
            {FEATURES.map((f, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span>{f.text}</span>
              </motion.li>
            ))}
          </ul>

          {/* Subscription Note */}
          <p className="text-xs text-muted-foreground text-center mb-4 px-2">
            Esta es una suscripción mensual. Puedes cancelarla en cualquier momento desde Configuración → Suscripción.
          </p>

          <div className="space-y-2">
            <Button 
              onClick={handleActivate} 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : isLoggedIn ? (
                "Activar Adbroll Pro"
              ) : (
                "Crear cuenta gratis"
              )}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Seguir explorando
            </Button>
          </div>

          {/* Policy Links */}
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
