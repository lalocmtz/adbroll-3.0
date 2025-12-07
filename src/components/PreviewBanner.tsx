import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBlurGate } from "@/hooks/useBlurGate";

export const PreviewBanner = () => {
  const navigate = useNavigate();
  const { isLoggedIn, hasPaid, loading } = useBlurGate();

  if (loading || hasPaid) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          {isLoggedIn ? (
            <>
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-foreground/80">
                <span className="font-medium">Modo gratuito</span> — Activa tu plan para desbloquear todo
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-foreground/80">
                <span className="font-medium">Vista previa</span> — Crea tu cuenta para continuar
              </span>
            </>
          )}
        </div>
        <Button
          size="sm"
          variant={isLoggedIn ? "default" : "outline"}
          onClick={() => navigate(isLoggedIn ? "/pricing" : "/register")}
          className="text-xs h-7 px-3"
        >
          {isLoggedIn ? "Activar $29/mes" : "Crear cuenta gratis"}
        </Button>
      </div>
    </div>
  );
};

export default PreviewBanner;