import { isCustomAffiliateCode, normalizeReferralCode } from "@/lib/referral-code";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AffiliateNetworkPanel } from "@/components/AffiliateNetworkPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Copy, Check, DollarSign, Users, TrendingUp, Gift, Share2, 
  Sparkles, Edit2, Save, X, ExternalLink, CreditCard, Clock,
  AlertCircle, CheckCircle2, Loader2
} from "lucide-react";
import { useAffiliate } from "@/hooks/useAffiliate";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const MINIMUM_PAYOUT = 50;

const Affiliates = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { affiliate, dashboard, loading, refetch } = useAffiliate();
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  // Fetch withdrawal history
  useEffect(() => {
    const fetchWithdrawals = async () => {
      if (!affiliate?.id) return;
      
      const { data } = await supabase
        .from("withdrawal_history")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) setWithdrawalHistory(data);
    };
    
    fetchWithdrawals();
  }, [affiliate?.id]);

  // Production domain for referral links
  const ADBROLL_DOMAIN = "https://tokxray.com";

  // Prefer the server-computed code from the dashboard RPC, fall back to the row.
  const activeCode = dashboard?.code ?? affiliate?.ref_code;

  // Available balance from the RPC (fallback to the row).
  const usdAvailable = dashboard?.usd_available ?? affiliate?.usd_available ?? 0;

  // Referrals + commissions come from the RPC (masked, server-computed).
  const dashReferrals = dashboard?.referrals ?? [];
  const commissionsHistory = dashboard?.commissions_history ?? [];

  const handleCopyLink = async () => {
    if (activeCode) {
      const link = `${ADBROLL_DOMAIN}/?ref=${activeCode}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: language === "es" ? "✓ Enlace copiado" : "✓ Link copied" });
    }
  };

  const handleCopyCode = async () => {
    if (activeCode) {
      await navigator.clipboard.writeText(activeCode);
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

      const { data: enrollment, error: enrollmentError } = await supabase.rpc("ensure_affiliate" as never);
      if (enrollmentError) throw enrollmentError;
      const codeToUse = (enrollment as unknown as { code: string }).code;

      toast({
        title: language === "es" ? "¡Código creado!" : "Code created!",
        description: `${language === "es" ? "Tu código:" : "Your code:"} ${codeToUse}`,
      });

      refetch();
    } catch (error) {
      console.error("Error creating affiliate code:", error);
      toast({
        title: "Error",
        description: language === "es" ? "No se pudo crear el código" : "Could not create code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStartEditCode = () => {
    setEditedCode(dashboard?.code ?? affiliate?.ref_code ?? "");
    setIsEditingCode(true);
  };

  const handleSaveCode = async () => {
    if (!isCustomAffiliateCode(editedCode)) return;
    
    setSavingCode(true);
    try {
      // Use the SECURITY DEFINER RPC: validates uniqueness, format and the
      // one-time customization rule (code_customized) atomically server-side.
      const { data, error } = await supabase.rpc("update_affiliate_code", {
        _new_code: normalizeReferralCode(editedCode),
      });

      if (error) throw error;
      const result = data as { success?: boolean; code?: string; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || (language === "es" ? "No se pudo actualizar" : "Could not update"));
      }

      toast({
        title: language === "es" ? "¡Código actualizado!" : "Code updated!",
        description: `${language === "es" ? "Tu nuevo código:" : "Your new code:"} ${result.code}`,
      });

      setIsEditingCode(false);
      refetch();
    } catch (error: any) {
      console.error("Error updating code:", error);
      toast({
        title: "Error",
        description: error.message || (language === "es" ? "No se pudo actualizar" : "Could not update"),
        variant: "destructive",
      });
    } finally {
      setSavingCode(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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
              {language === "es" ? "Tu código y tus comisiones" : "Your code and commissions"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === "es"
                ? "Comparte cómo eliges una referencia y preparas un guion con TokXray."
                : "Share how you choose a reference and prepare a script with TokXray."}
            </p>
          </div>
        </div>
        <Button asChild variant="link" className="h-auto px-0 text-primary">
          <Link to="/gana">
            {language === "es" ? "Cómo ganar dinero con TokXray" : "How to earn with TokXray"}
          </Link>
        </Button>
      </div>

      {/* Hero Card */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-200/50 dark:border-green-900/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-green-500/20 hidden sm:block">
            <Gift className="h-8 w-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">
              {language === "es" ? "US$5 por el primer pago. 15% por las renovaciones." : "US$5 for the first payment. 15% for renewals."}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {language === "es"
                ? "Por cada cliente nuevo que se suscriba con tu código, recibes US$5 por su primer pago elegible y 15% de sus renovaciones. Crear una cuenta gratuita no genera comisión."
                : "For each new customer who subscribes with your code, you receive US$5 for their first eligible payment and 15% of renewals. Creating a free account does not earn a commission."}
            </p>
            <p className="text-sm font-medium text-green-600 mb-4">
              {language === "es"
                ? "Una renovación completa de US$15 genera US$2.25 para ti."
                : "A full US$15 renewal earns you US$2.25."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {language === "es" ? "Sin límite de seis meses" : "No six-month limit"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {language === "es" ? "Comisión recurrente" : "Recurring commission"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {language === "es" ? "Revisión semanal de pagos" : "Weekly payment review"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* How it works — 3 simple steps, up top */}
      <Card className="p-5 mb-6">
        <h3 className="font-semibold mb-4">
          {language === "es" ? "Cómo funciona" : "How it works"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-sm">
                {language === "es" ? "Comparte tu código" : "Share your code"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Muéstralo junto a un ejemplo de uso."
                  : "Show it alongside an example of how you use TokXray."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-sm">
                {language === "es" ? "Un cliente contrata Pro" : "A customer subscribes to Pro"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Su compra queda ligada a tu código." : "Their purchase is linked to your code."}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-sm text-green-600">
                {language === "es" ? "Consulta tus comisiones" : "Check your commissions"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Se registran cuando se cobra un pago elegible."
                  : "They are recorded when an eligible payment is collected."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {affiliate ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Para nuevos clientes: hasta $5 USD del primer pago y $2.25 USD de cada renovación completa de $15. Tu cliente paga $15 USD desde el primer mes. Sin límite de seis meses. Retiros desde $50 USD. <a href="/terminos-afiliados" className="underline">Condiciones del programa</a>.</p>
          {/* Share Section — first, so the link is the hero action */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {language === "es" ? "Tu enlace para recomendar Pro" : "Your link to recommend Pro"}
              </h3>
            </div>

            <div className="space-y-4">
              {/* One-click copy link — the primary action */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Enlace para nuevos clientes" : "Link for new customers"}
                </label>
                <div className="flex min-w-0 gap-2">
                  <Input
                    value={`${ADBROLL_DOMAIN}/?ref=${activeCode}`}
                    readOnly
                    className="min-w-0 text-sm"
                  />
                  <Button onClick={handleCopyLink} className="shrink-0 gap-2 h-11 px-3">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied
                      ? (language === "es" ? "¡Copiado!" : "Copied!")
                      : (language === "es" ? "Copiar enlace" : "Copy link")}
                  </Button>
                </div>
              </div>

              {/* Editable code (one-time) */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Tu código de creador" : "Your creator code"}
                </label>
                <div className="flex min-w-0 gap-2">
                  {isEditingCode ? (
                    <>
                      <Input
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value.toUpperCase())}
                        className="min-w-0 font-mono font-bold tracking-wider text-lg uppercase"
                        placeholder="TUCODIGO"
                        maxLength={12}
                      />
                      <Button
                        variant="outline"
                        onClick={handleSaveCode}
                        disabled={savingCode || !isCustomAffiliateCode(editedCode)}
                        className="shrink-0"
                      >
                        {savingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditingCode(false)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={activeCode}
                        readOnly
                        className="min-w-0 font-mono font-bold tracking-wider text-lg"
                      />
                      <Button
                        variant="outline"
                        onClick={handleStartEditCode}
                        disabled={dashboard?.code_customized}
                        title={dashboard?.code_customized
                          ? (language === "es" ? "Ya personalizaste tu código" : "Code already customized")
                          : undefined}
                        className="shrink-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={handleCopyCode} className="shrink-0">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {dashboard?.code_customized
                    ? (language === "es"
                        ? "Ya personalizaste tu código (solo se puede cambiar una vez)."
                        : "You already customized your code (it can only be changed once).")
                    : (language === "es"
                        ? "Puedes personalizarlo una vez, antes de recibir referidos o vincular creadores (3–12 letras o números)."
                        : "Customize once before receiving referrals or adding creators (3–12 letters or numbers).")}
                </p>
              </div>
            </div>
          </Card>

          <AffiliateNetworkPanel code={activeCode || ""} onJoined={refetch} />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">
                {dashboard?.active_referrals ?? affiliate.active_referrals_count}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Clientes directos activos" : "Active direct customers"}
              </p>
            </Card>

            <Card className="p-4 text-center bg-green-50/50 dark:bg-green-950/20">
              <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboard?.usd_earned ?? affiliate.usd_earned)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Total ganado" : "Total earned"}
              </p>
            </Card>

            <Card className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-950/20">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(dashboard?.usd_available ?? affiliate.usd_available)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Disponible" : "Available"}
              </p>
            </Card>

            <Card className="p-4 text-center">
              <Gift className="h-5 w-5 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(dashboard?.usd_withdrawn ?? affiliate.usd_withdrawn)}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Retirado" : "Withdrawn"}
              </p>
            </Card>
          </div>

          {dashboard?.payout_hold && <Card className="p-5 border-amber-400"><p className="font-semibold">Pagos en revisión</p><p className="text-sm text-muted-foreground">Hay un cobro en disputa asociado a tus comisiones. Los retiros están pausados mientras se concilia. Contacta a soporte para revisar el caso.</p></Card>}
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">{language === "es" ? "Pagos por transferencia manual" : "Manual bank transfers"}</h3>
            <p className="text-sm text-muted-foreground">{language === "es"
              ? "Aquí se acumulan tus comisiones por suscripciones cobradas. El equipo de TokXray revisa el saldo semanalmente y se pone en contacto contigo para coordinar el depósito. No necesitas conectar una cuenta de Stripe."
              : "Your commissions come from paid subscriptions. The TokXray team reviews balances weekly and contacts you to arrange a bank transfer. You do not need a Stripe account."}</p>
            <p className="text-sm font-medium">{language === "es" ? "Mínimo de pago: $50 USD" : "Minimum payment: $50 USD"}</p>
            <p className="min-w-0 text-sm">{usdAvailable >= MINIMUM_PAYOUT
              ? (language === "es" ? "Tu saldo alcanza el mínimo para la revisión semanal." : "Your balance meets the minimum for weekly review.")
              : (language === "es" ? `Te faltan ${formatCurrency(MINIMUM_PAYOUT - usdAvailable)} para el mínimo.` : `You need ${formatCurrency(MINIMUM_PAYOUT - usdAvailable)} more to reach the minimum.`)}</p>
            <p className="text-xs text-muted-foreground">{language === "es" ? "El saldo disponible no significa que el depósito ya se haya realizado. Cada pago confirmado aparecerá en tu historial. Los reembolsos y disputas pueden ajustar el saldo." : "Available balance does not mean a transfer has been sent. Confirmed payments appear in your history. Refunds and disputes may adjust your balance."}</p>
          </Card>

          {/* Withdrawal History */}
          {withdrawalHistory.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4">
                {language === "es" ? "Historial de retiros" : "Withdrawal history"}
              </h3>
              <div className="space-y-2">
                {withdrawalHistory.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-3 rounded-lg bg-muted/50 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(withdrawal.created_at).toLocaleDateString(language === "es" ? "es-MX" : "en-US")}
                      </p>
                      <Badge
                        variant={withdrawal.status === "completed" ? "default" : "secondary"}
                        className="mt-1 text-xs"
                      >
                        {withdrawal.status === "completed" 
                          ? (language === "es" ? "Completado" : "Completed") 
                          : (language === "es" ? "Pendiente" : "Pending")}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(withdrawal.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Referrals */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">
              {language === "es" ? "Tus clientes directos" : "Your direct customers"}
            </h3>
            {dashReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {language === "es"
                    ? "Todavía no hay clientes vinculados a tu código. Comparte tu enlace cuando muestres cómo usas TokXray."
                    : "No customers are linked to your code yet. Share your link when you show how you use TokXray."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashReferrals.map((referral, i) => (
                  <div
                    key={`${referral.email_masked}-${i}`}
                    className="p-3 rounded-lg bg-muted/50 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{referral.email_masked}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={referral.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {referral.status === "active"
                            ? (language === "es" ? "Activo" : "Active")
                            : (language === "es" ? "Pendiente" : "Pending")}
                        </Badge>
                        {referral.since && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(referral.since).toLocaleDateString(language === "es" ? "es-MX" : "en-US")}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-base font-bold text-green-600">
                      +{formatCurrency(referral.monthly_commission)}<span className="text-xs font-normal text-muted-foreground">/mes</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Commissions History */}
          {commissionsHistory.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4">
                {language === "es" ? "Comisiones por clientes directos" : "Direct customer commissions"}
              </h3>
              <div className="space-y-2">
                {commissionsHistory.map((commission, i) => (
                  <div
                    key={`${commission.month}-${i}`}
                    className="p-3 rounded-lg bg-muted/50 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {commission.date
                          ? new Date(commission.date).toLocaleDateString(language === "es" ? "es-MX" : "en-US")
                          : commission.month}
                      </p>
                      <Badge
                        variant={commission.status === "paid" ? "default" : "secondary"}
                        className="mt-1 text-xs"
                      >
                        {commission.status === "paid"
                          ? (language === "es" ? "Pagado" : "Paid")
                          : (language === "es" ? "Pendiente" : "Pending")}
                      </Badge>
                    </div>
                    <p className="text-base font-bold text-green-600">
                      +{formatCurrency(commission.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">
            {language === "es" ? "Prepara tu código para recomendar TokXray" : "Set up your code to recommend TokXray"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {language === "es" 
              ? "Crea tu código y compártelo al enseñar una referencia o un guion que te haya servido. Recibes hasta US$5 por el primer pago de un cliente nuevo y 15% de sus renovaciones elegibles."
              : "Create your code and share it when showing a reference or script you found useful. You receive up to US$5 for a new customer's first payment and 15% of eligible renewals."}
          </p>
          <Button 
            size="lg" 
            onClick={handleCreateAffiliateCode}
            disabled={creating}
            className="gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
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
