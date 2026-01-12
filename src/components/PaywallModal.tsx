import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Sparkles, Video, Loader2, Star, X, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBlurGate } from "@/hooks/useBlurGate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackInitiateCheckout } from "@/lib/analytics";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_FEATURES = [
  { icon: Sparkles, text: "Scripts reales extraídos" },
  { icon: Sparkles, text: "Variantes IA ilimitadas" },
  { icon: Sparkles, text: "Oportunidades de productos" },
  { icon: Sparkles, text: "Panel de afiliados (30%)" },
];

const PREMIUM_FEATURES = [
  { icon: Video, text: "5 videos IA/mes" },
  { icon: Wand2, text: "Lip-sync automático" },
  { icon: Video, text: "Sin salir a cámara" },
];

export const PaywallModal = ({ open, onClose, feature }: PaywallModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { isLoggedIn, session } = useBlurGate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (plan: "pro" | "premium") => {
    // Track InitiateCheckout event for Meta Pixel
    const value = plan === "premium" ? 29.99 : 14.99;
    const planName = plan === "premium" ? "Adbroll Premium" : "Adbroll Pro";
    trackInitiateCheckout(value, "USD", planName);
    
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
      <DialogContent className="sm:max-w-2xl">
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
            {feature ? `Desbloquea "${feature}"` : "Desbloquea Adbroll"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pro Plan */}
            <Card className="p-4 border-2 border-border hover:border-primary/50 transition-colors">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">Pro</h3>
                <div className="text-2xl font-bold mt-1">$14.99<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                <p className="text-xs text-muted-foreground mt-1">Para creadores que graban</p>
              </div>

              <ul className="space-y-2 mb-4">
                {PRO_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                <X className="w-3 h-3" />
                <span>Sin videos IA</span>
              </div>

              <Button 
                variant="outline"
                onClick={() => handleSelectPlan("pro")} 
                className="w-full" 
                size="sm"
                disabled={loadingPlan === "pro"}
              >
                {loadingPlan === "pro" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLoggedIn ? "Activar Pro" : "Empezar con Pro"}
              </Button>
            </Card>

            {/* Premium Plan */}
            <Card className="p-4 border-2 border-primary relative">
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                <Star className="w-2 h-2 mr-1" />
                POPULAR
              </Badge>

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">Premium</h3>
                <div className="text-2xl font-bold mt-1 text-primary">$29.99<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                <p className="text-xs text-muted-foreground mt-1">Sin salir a cámara</p>
              </div>

              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-xs font-medium">
                  <Check className="w-3 h-3 text-green-500" />
                  <span>Todo lo de Pro</span>
                </li>
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={() => handleSelectPlan("premium")} 
                className="w-full" 
                size="sm"
                disabled={loadingPlan === "premium"}
              >
                {loadingPlan === "premium" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLoggedIn ? "Activar Premium" : "Empezar con Premium"}
              </Button>
            </Card>
          </div>

          <Button variant="ghost" onClick={onClose} className="w-full mt-4 text-muted-foreground">
            Seguir explorando
          </Button>

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
