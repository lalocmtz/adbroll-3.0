import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreditPacksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDIT_PACKS = [
  {
    id: "pack_3",
    videos: 3,
    price: 9.99,
    pricePerVideo: 3.33,
    popular: false,
  },
  {
    id: "pack_10",
    videos: 10,
    price: 24.99,
    pricePerVideo: 2.50,
    popular: true,
  },
];

export const CreditPacksModal = ({ open, onOpenChange }: CreditPacksModalProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-credits", {
        body: { pack: packId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo iniciar la compra. Intenta de nuevo." 
          : "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10"
          >
            <Video className="w-6 h-6 text-primary" />
          </motion.div>
          <DialogTitle className="text-center text-xl">
            {language === "es" ? "Compra más videos IA" : "Buy more AI videos"}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {language === "es" 
              ? "Agrega créditos para seguir generando videos con lip-sync" 
              : "Add credits to keep generating lip-sync videos"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {CREDIT_PACKS.map((pack) => (
              <Card 
                key={pack.id}
                className={`relative p-4 cursor-pointer transition-all hover:border-primary ${
                  pack.popular ? "border-primary border-2" : "border-border"
                }`}
                onClick={() => !loading && handlePurchase(pack.id)}
              >
                {pack.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                    {language === "es" ? "MEJOR DEAL" : "BEST DEAL"}
                  </Badge>
                )}
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Video className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{pack.videos}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {language === "es" ? "videos" : "videos"}
                  </p>
                  
                  <div className="text-xl font-bold mb-1">${pack.price}</div>
                  <p className="text-[10px] text-muted-foreground">
                    ${pack.pricePerVideo.toFixed(2)}/{language === "es" ? "video" : "video"}
                  </p>

                  <Button 
                    className="w-full mt-3" 
                    size="sm"
                    disabled={loading === pack.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pack.id);
                    }}
                  >
                    {loading === pack.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      language === "es" ? "Comprar" : "Buy"
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            <span>{language === "es" ? "Los créditos no expiran" : "Credits never expire"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPacksModal;
