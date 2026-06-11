import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  Gift,
  Zap,
} from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PricingModal = ({ open, onOpenChange }: PricingModalProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [session, setSession] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const checkReferral = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("referral_code_used")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.referral_code_used) {
          setReferralCode(profile.referral_code_used);
          setReferralValid(true);
        }
      }
    };
    checkReferral();
  }, [open]);

  const proFeatures = language === "es" 
    ? [
        "Dashboard de videos virales",
        "Scripts reales + extractor IA",
        "Variantes IA ilimitadas",
        "Hooks generados por IA",
        "Panel de afiliados (30%)",
      ]
    : [
        "Viral videos dashboard",
        "Real scripts + AI extractor",
        "Unlimited AI variants",
        "AI-generated hooks",
        "Affiliate panel (30%)",
      ];

  const handleSelectPlan = async (plan: "pro") => {
    setLoadingPlan(plan);
    onOpenChange(false);
    const refParam = referralCode ? `&ref=${referralCode}` : "";

    if (session) {
      // Logged in user - direct to checkout
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (err) {
        console.error("Checkout error:", err);
      }
      navigate(`/pricing`);
    } else {
      navigate(`/register?redirect=/checkout?plan=${plan}${refParam}`);
    }
    setLoadingPlan(null);
  };

  const proPrice = 25;
  const discountedProPrice = referralValid ? proPrice * 0.5 : proPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {language === "es" ? "Un solo plan, todo incluido" : "One plan, everything included"}
          </DialogTitle>
        </DialogHeader>

        {referralValid && (
          <div className="mb-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center justify-center gap-2">
            <Gift className="h-4 w-4 text-green-600" />
            <p className="text-green-800 dark:text-green-300 font-medium text-sm">
              {language === "es"
                ? "¡Descuento aplicado! 50% off en tu primer mes 🎉"
                : "Discount applied! 50% off your first month 🎉"}
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {/* Pro Plan */}
          <Card className="relative p-5 border-2 border-primary">
            <div className="text-center mb-4">
              <div className="inline-flex p-2 rounded-lg mb-2 bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg">TokXray Pro</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "es" ? "Todas las herramientas para creadores de TikTok Shop" : "All tools for TikTok Shop creators"}
              </p>

              <div className="flex items-baseline justify-center gap-1 mt-3">
                {referralValid ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      ${proPrice}
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      ${discountedProPrice.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold">${proPrice}</span>
                )}
                <span className="text-muted-foreground text-sm">
                  /{language === "es" ? "mes" : "month"}
                </span>
              </div>
            </div>

            <ul className="space-y-2 mb-4 text-sm">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              onClick={() => handleSelectPlan("pro")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "pro" ? "..." : language === "es" ? "Empezar ahora" : "Start now"}
            </Button>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;