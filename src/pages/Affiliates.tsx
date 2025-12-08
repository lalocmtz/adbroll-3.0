import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, DollarSign, Users, TrendingUp, Gift, Share2, Sparkles } from "lucide-react";
import { useAffiliate } from "@/hooks/useAffiliate";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const Affiliates = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { affiliate, referrals, loading, refetch } = useAffiliate();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCopyLink = async () => {
    if (affiliate?.ref_code) {
      const link = `${window.location.origin}?ref=${affiliate.ref_code}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: language === "es" ? "✓ Enlace copiado" : "✓ Link copied" });
    }
  };

  const handleCopyCode = async () => {
    if (affiliate?.ref_code) {
      await navigator.clipboard.writeText(affiliate.ref_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: language === "es" ? "✓ Código copiado" : "✓ Code copied" });
    }
  };

  const handleCreateAffiliateCode = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Generate unique code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_ref_code");
      if (codeError) throw codeError;

      const newCode = codeData as string;

      // Create in affiliate_codes table
      const { error: affiliateCodeError } = await supabase
        .from("affiliate_codes")
        .insert({ user_id: user.id, code: newCode });

      if (affiliateCodeError) throw affiliateCodeError;

      // Create in affiliates table
      const { error: affiliateError } = await supabase
        .from("affiliates")
        .insert({ 
          user_id: user.id, 
          ref_code: newCode,
          active_referrals_count: 0,
          usd_earned: 0,
          usd_available: 0,
          usd_withdrawn: 0,
        });

      if (affiliateError) throw affiliateError;

      toast({
        title: language === "es" ? "¡Código creado!" : "Code created!",
        description: `${language === "es" ? "Tu código:" : "Your code:"} ${newCode}`,
      });

      refetch();
    } catch (error) {
      console.error("Error creating affiliate code:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo crear el código" 
          : "Could not create code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="pt-5 pb-6 px-4 md:px-6 max-w-4xl">
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <DollarSign className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {language === "es" ? "Programa de Afiliados" : "Affiliate Program"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === "es" 
                ? "💰 Gana dinero invitando creadores a Adbroll"
                : "💰 Earn money by inviting creators to Adbroll"}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-200/50 dark:border-green-900/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-green-500/20 hidden sm:block">
            <Gift className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">
              {language === "es" ? "💰 Gana 30% recurrente por cada referido" : "💰 Earn 30% recurring per referral"}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {language === "es" 
                ? "Cada vez que alguien se registre con tu código y se suscriba a Adbroll Pro, recibirás el 30% de su pago mensual."
                : "Every time someone signs up with your code and subscribes to Adbroll Pro, you'll receive 30% of their monthly payment."}
            </p>
            <p className="text-sm font-medium text-green-600 mb-4">
              {language === "es" 
                ? "≈ $8.70 USD al mes por cada usuario activo"
                : "≈ $8.70 USD per month for each active user"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {language === "es" ? "Sin límite" : "No limit"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {language === "es" ? "Comisión recurrente" : "Recurring commission"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {affiliate ? (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">
                {affiliate.active_referrals_count}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Referidos" : "Referrals"}
              </p>
            </Card>

            <Card className="p-4 text-center bg-green-50/50 dark:bg-green-950/20">
              <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(affiliate.usd_earned)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Ganado" : "Earned"}
              </p>
            </Card>

            <Card className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-950/20">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(affiliate.usd_available)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Disponible" : "Available"}
              </p>
            </Card>

            <Card className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(affiliate.usd_withdrawn)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Retirado" : "Withdrawn"}
              </p>
            </Card>
          </div>

          {/* Share Section */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {language === "es" ? "Comparte tu enlace" : "Share your link"}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Affiliate Code */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Tu código de afiliado" : "Your affiliate code"}
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={affiliate.ref_code} 
                    readOnly 
                    className="font-mono font-bold tracking-wider text-lg"
                  />
                  <Button variant="outline" onClick={handleCopyCode} className="shrink-0 gap-2">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Full Link */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Tu enlace de referido" : "Your referral link"}
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}?ref=${affiliate.ref_code}`} 
                    readOnly 
                    className="text-sm"
                  />
                  <Button onClick={handleCopyLink} className="shrink-0 gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {language === "es" ? "Copiar" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Referrals History */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">
              {language === "es" ? "Historial de Referidos" : "Referral History"}
            </h3>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {language === "es" 
                    ? "Aún no tienes referidos. ¡Comparte tu código!"
                    : "No referrals yet. Share your code!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.date || referral.created_at).toLocaleDateString(language === "es" ? "es-MX" : "en-US")}
                      </p>
                      <Badge
                        variant={referral.status === "active" ? "default" : "secondary"}
                        className="mt-1 text-xs"
                      >
                        {referral.status === "active" 
                          ? (language === "es" ? "Activo" : "Active") 
                          : (language === "es" ? "Pendiente" : "Pending")}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(referral.earned_usd)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* How it works */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">
              {language === "es" ? "¿Cómo funciona?" : "How does it work?"}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {language === "es" ? "Comparte" : "Share"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" 
                      ? "Tu enlace a creadores"
                      : "Your link to creators"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {language === "es" ? "Se suscriben" : "They subscribe"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" 
                      ? "A Adbroll Pro por $29/mes"
                      : "To Adbroll Pro for $29/mo"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-sm text-green-600">
                    {language === "es" ? "¡Ganas 30%!" : "You earn 30%!"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" 
                      ? "≈$8.70/mes por usuario"
                      : "≈$8.70/mo per user"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* CTA to create affiliate code */
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">
            {language === "es" 
              ? "¡Empieza a ganar dinero hoy!" 
              : "Start earning money today!"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {language === "es" 
              ? "Crea tu código de afiliado único y compártelo con otros creadores. Ganarás 30% de cada pago que hagan."
              : "Create your unique affiliate code and share it with other creators. You'll earn 30% of every payment they make."}
          </p>
          <Button 
            size="lg" 
            onClick={handleCreateAffiliateCode}
            disabled={creating}
            className="gap-2"
          >
            {creating ? (
              <>
                <span className="animate-spin">⏳</span>
                {language === "es" ? "Creando..." : "Creating..."}
              </>
            ) : (
              <>
                <Gift className="h-5 w-5" />
                {language === "es" ? "Crear mi código de afiliado" : "Create my affiliate code"}
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default Affiliates;