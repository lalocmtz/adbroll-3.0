import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Check, X, LogIn, Loader2, TrendingUp, FileText, Gem } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SimpleEmailCaptureModal } from "@/components/SimpleEmailCaptureModal";
import { trackInitiateCheckout } from "@/lib/analytics";
import logoDark from "@/assets/logo-dark.png";

const Unlock = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRefCode = searchParams.get("ref");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [hasProspectEmail, setHasProspectEmail] = useState(false);

  const refCode = urlRefCode || localStorage.getItem("adbroll_ref_code");

  useEffect(() => {
    if (urlRefCode) {
      localStorage.setItem("adbroll_ref_code", urlRefCode.toUpperCase());
    }
  }, [urlRefCode]);

  useEffect(() => {
    const prospectEmail = localStorage.getItem("adbroll_prospect_email");
    if (prospectEmail) {
      setHasProspectEmail(true);
    } else {
      setShowEmailModal(true);
    }
  }, []);

  useEffect(() => {
    if (hasProspectEmail && window.location.hash === "#pricing") {
      setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [hasProspectEmail]);

  const handleSubscribe = async () => {
    const prospectEmail = localStorage.getItem("adbroll_prospect_email");
    if (!prospectEmail) {
      setShowEmailModal(true);
      return;
    }
    await processCheckout(prospectEmail);
  };

  const processCheckout = async (email: string) => {
    setIsLoading(true);
    trackInitiateCheckout(25, "USD", "Adbroll Pro");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-guest", {
        body: {
          email: email,
          referral_code: refCode,
          plan: "pro",
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Error al procesar. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailCaptured = () => {
    setShowEmailModal(false);
    setHasProspectEmail(true);
    setTimeout(() => {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleClose = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen landing-light text-foreground overflow-hidden relative">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-3 md:px-4 py-2.5 md:py-4 flex items-center justify-between">
          <button onClick={handleClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
            <span className="text-sm font-medium hidden md:inline">Volver al feed</span>
          </button>
          <button onClick={() => navigate("/app")} className="flex items-center absolute left-1/2 -translate-x-1/2">
            <img src={logoDark} alt="Adbroll" className="h-7 md:h-10" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={handleLogin}>
              <LogIn className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — minimal, above fold */}
      <section className="pt-24 md:pt-32 pb-8 md:pb-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-foreground leading-tight">
              Descubre qué videos están vendiendo{" "}
              <span className="text-primary">HOY</span> en TikTok Shop
            </h1>
            <p className="text-muted-foreground text-sm md:text-lg mb-6 md:mb-8">
              Scripts virales, análisis IA y oportunidades de productos. Todo por $25/mes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-6 md:mb-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Videos con más ventas
              </span>
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Guiones extraídos por IA
              </span>
              <span className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-primary" />
                Productos oportunidad
              </span>
            </div>

            <Button
              size="lg"
              className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg"
              onClick={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Empezar ahora — $25/mes
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <button
              onClick={handleLogin}
              className="block mx-auto mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ¿Ya tienes cuenta?{" "}
              <span className="font-medium text-primary hover:underline">Iniciar sesión</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Demo Video — large, centered */}
      <section className="pb-10 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-xl md:rounded-2xl overflow-hidden shadow-xl md:shadow-2xl border border-border"
            >
              <video
                src="https://gcntnilurlulejwwtpaa.supabase.co/storage/v1/object/public/assets/landing-video-1766294993055.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-video object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing / Checkout Block */}
      {hasProspectEmail ? (
        <section id="pricing" className="py-10 md:py-16 landing-section-alt">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-2">
                Desbloquea todo Adbroll
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                Un solo precio. Sin límites. Cancela cuando quieras.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-md mx-auto"
            >
              <Card className="p-6 md:p-8 border-2 border-primary bg-white relative shadow-xl ring-2 ring-primary/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white px-4 py-1">
                    <Sparkles className="h-3 w-3 mr-1 fill-current" />
                    ACCESO COMPLETO
                  </Badge>
                </div>
                <div className="text-center mb-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <h3 className="text-2xl font-bold">Adbroll Pro</h3>
                  <p className="text-sm text-muted-foreground">Todo lo que necesitas para vender</p>
                </div>
                <div className="text-center mb-6">
                  <span className="text-5xl font-bold text-primary">$25</span>
                  <span className="text-muted-foreground text-lg">/mes</span>
                  <p className="text-sm text-muted-foreground mt-1">~$500 MXN/mes</p>
                </div>
                <ul className="space-y-3 mb-6 text-sm">
                  {[
                    "Dashboard con videos virales",
                    "Scripts reales extraídos automáticamente",
                    "Variantes IA ilimitadas",
                    "Hooks generados por IA",
                    "Oportunidades de productos",
                    "Panel de afiliados (30% comisión)",
                    "Todas las herramientas incluidas"
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-12 text-base"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Suscribirme ahora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </Card>
            </motion.div>

            {/* Trust line */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Cancela cuando quieras · Sin compromisos · Pago seguro con Stripe
            </p>
          </div>
        </section>
      ) : (
        <section className="py-10 md:py-16 landing-section-alt min-h-[40vh] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm">Cargando...</p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoDark} alt="Adbroll" className="h-6" />
              <span className="text-sm text-muted-foreground">© 2025</span>
            </div>
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
                Términos
              </button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
                Privacidad
              </button>
              <button onClick={() => navigate("/refund-policy")} className="hover:text-foreground transition-colors">
                Reembolsos
              </button>
              <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors">
                Soporte
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Email Capture Modal */}
      <SimpleEmailCaptureModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        onSuccess={handleEmailCaptured}
        redirectOnSuccess={false}
      />
    </div>
  );
};

export default Unlock;
