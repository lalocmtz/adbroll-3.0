import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Lock, Sparkles, TrendingUp, Video, Wand2, Globe, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBlurGate } from "@/hooks/useBlurGate";

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
  const { isLoggedIn } = useBlurGate();

  const handleActivate = () => {
    if (!isLoggedIn) {
      navigate("/register");
    } else {
      // TODO: Open Stripe checkout
      navigate("/pricing");
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {feature ? `Desbloquea "${feature}"` : "Desbloquea todo Adbroll"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-foreground">$29<span className="text-lg font-normal text-muted-foreground">/mes</span></div>
            <p className="text-sm text-muted-foreground mt-1">Cancela cuando quieras</p>
          </div>

          <ul className="space-y-3 mb-6">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Button onClick={handleActivate} className="w-full" size="lg">
              {isLoggedIn ? "Activar Adbroll Pro" : "Crear cuenta gratis"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Seguir explorando
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;