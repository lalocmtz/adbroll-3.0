import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email({ message: "Ingresa un email válido" });

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode?: string | null;
}

export const EmailCaptureModal = ({ open, onOpenChange, referralCode }: EmailCaptureModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          referral_code: referralCode 
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
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-white">
            Ingresa tu Email
          </DialogTitle>
          <p className="text-center text-zinc-400 mt-2">
            Por favor ingresa tu correo electrónico para continuar con tu suscripción.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="sr-only">Email</Label>
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

          <div className="flex gap-3">
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
                "Continuar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
