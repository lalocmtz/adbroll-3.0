import { useState, useEffect } from "react";
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
  const [connectLoading, setConnectLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
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

  // Check URL params for connect status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast({
        title: language === "es" ? "¡Cuenta conectada!" : "Account connected!",
        description: language === "es" 
          ? "Tu cuenta de Stripe está lista para recibir pagos"
          : "Your Stripe account is ready to receive payments",
      });
      window.history.replaceState({}, "", "/affiliates");
      refetch();
    }
  }, []);

  // Production domain for referral links
  const ADBROLL_DOMAIN = "https://tokxray.com";

  // Prefer the server-computed code from the dashboard RPC, fall back to the row.
  const activeCode = dashboard?.code ?? affiliate?.ref_code;

  // Stripe Connect state — prefer server-computed flags from the dashboard RPC,
  // fall back to the raw affiliate row if the RPC is unavailable.
  const hasConnect =
    dashboard?.has_connect ?? Boolean((affiliate as any)?.stripe_connect_id);
  const connectReady =
    dashboard?.connect_ready ?? Boolean((affiliate as any)?.stripe_onboarding_complete);

  // Available balance from the RPC (fallback to the row).
  const usdAvailable = dashboard?.usd_available ?? affiliate?.usd_available ?? 0;

  // Referrals + commissions come from the RPC (masked, server-computed).
  const dashReferrals = dashboard?.referrals ?? [];
  const commissionsHistory = dashboard?.commissions_history ?? [];

  const handleCopyLink = async () => {
    if (activeCode) {
      const link = `${ADBROLL_DOMAIN}?ref=${activeCode}`;
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

      // First check if user already has a code in affiliate_codes
      const { data: existingCode } = await supabase
        .from("affiliate_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle();

      let codeToUse: string;

      if (existingCode?.code) {
        // User already has a code, use it
        codeToUse = existingCode.code;
      } else {
        // Generate new code
        const { data: codeData, error: codeError } = await supabase.rpc("generate_ref_code");
        if (codeError) throw codeError;

        codeToUse = codeData as string;

        // Insert into affiliate_codes
        const { error: affiliateCodeError } = await supabase
          .from("affiliate_codes")
          .insert({ user_id: user.id, code: codeToUse });

        if (affiliateCodeError) throw affiliateCodeError;
      }

      // Check if affiliates record exists
      const { data: existingAffiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingAffiliate) {
        // Create affiliates record
        const { error: affiliateError } = await supabase
          .from("affiliates")
          .insert({ 
            user_id: user.id, 
            ref_code: codeToUse,
            active_referrals_count: 0,
            usd_earned: 0,
            usd_available: 0,
            usd_withdrawn: 0,
          });

        if (affiliateError) throw affiliateError;
      }

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
    if (!editedCode.trim()) return;
    
    setSavingCode(true);
    try {
      // Use the SECURITY DEFINER RPC: validates uniqueness, format and the
      // one-time customization rule (code_customized) atomically server-side.
      const { data, error } = await supabase.rpc("update_affiliate_code", {
        _new_code: editedCode.trim(),
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

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-create-connect");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error connecting Stripe:", error);
      toast({
        title: "Error",
        description: error.message || (language === "es" ? "No se pudo conectar" : "Could not connect"),
        variant: "destructive",
      });
      setConnectLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setDashboardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-dashboard-link");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening dashboard:", error);
      toast({
        title: "Error",
        description: error.message || (language === "es" ? "No se pudo abrir" : "Could not open"),
        variant: "destructive",
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getNextWednesday = () => {
    const now = new Date();
    const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
    const nextWednesday = new Date(now);
    nextWednesday.setDate(now.getDate() + daysUntilWednesday);
    return nextWednesday.toLocaleDateString(language === "es" ? "es-MX" : "en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
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
                ? "💰 Gana dinero invitando creadores a TokXray"
                : "💰 Earn money by inviting creators to TokXray"}
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
                ? "Cada vez que alguien se registre con tu código y se suscriba a TokXray Pro, recibirás el 30% de su pago mensual."
                : "Every time someone signs up with your code and subscribes to TokXray Pro, you'll receive 30% of their monthly payment."}
            </p>
            <p className="text-sm font-medium text-green-600 mb-4">
              {language === "es"
                ? "≈ $7.50 USD al mes por cada usuario activo"
                : "≈ $7.50 USD per month for each active user"}
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
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {language === "es" ? "Pagos cada miércoles" : "Paid every Wednesday"}
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
                {language === "es" ? "Comparte tu link" : "Share your link"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Mándalo a otros creadores"
                  : "Send it to other creators"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-sm">
                {language === "es" ? "Alguien se suscribe" : "Someone subscribes"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Con tu link, a TokXray" : "With your link, to TokXray"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-sm text-green-600">
                {language === "es" ? "Ganas $7.50/mes" : "You earn $7.50/mo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Mientras siga pagando"
                  : "For as long as they keep paying"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {affiliate ? (
        <div className="space-y-6">
          {/* Share Section — first, so the link is the hero action */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {language === "es" ? "Tu link de afiliado" : "Your affiliate link"}
              </h3>
            </div>

            <div className="space-y-4">
              {/* One-click copy link — the primary action */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Tu link de referido" : "Your referral link"}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={`${ADBROLL_DOMAIN}?ref=${activeCode}`}
                    readOnly
                    className="text-sm"
                  />
                  <Button onClick={handleCopyLink} className="shrink-0 gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied
                      ? (language === "es" ? "¡Copiado!" : "Copied!")
                      : (language === "es" ? "Copiar mi link" : "Copy my link")}
                  </Button>
                </div>
              </div>

              {/* Editable code (one-time) */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {language === "es" ? "Tu código" : "Your code"}
                </label>
                <div className="flex gap-2">
                  {isEditingCode ? (
                    <>
                      <Input
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value.toUpperCase())}
                        className="font-mono font-bold tracking-wider text-lg uppercase"
                        placeholder="TUCODIGO"
                        maxLength={12}
                      />
                      <Button
                        variant="outline"
                        onClick={handleSaveCode}
                        disabled={savingCode}
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
                        className="font-mono font-bold tracking-wider text-lg"
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
                        ? "Puedes personalizarlo una sola vez (4-12 letras o números). Toca el lápiz."
                        : "You can customize it one time only (4-12 letters or numbers). Tap the pencil.")}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">
                {dashboard?.active_referrals ?? affiliate.active_referrals_count}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" ? "Activos" : "Active"}
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

          {/* Stripe Connect Section */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {language === "es" ? "Cuenta de cobro" : "Payout account"}
              </h3>
            </div>

            {!hasConnect ? (
              <div className="text-center py-4">
                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "es"
                    ? "Conecta tu cuenta bancaria para recibir tus pagos automáticamente cada miércoles."
                    : "Connect your bank account to receive payments automatically every Wednesday."}
                </p>
                <Button onClick={handleConnectStripe} disabled={connectLoading} className="gap-2">
                  {connectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {language === "es" ? "Conectar cuenta bancaria" : "Connect bank account"}
                </Button>
              </div>
            ) : !connectReady ? (
              <div className="text-center py-4">
                <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "es"
                    ? "Tu cuenta está pendiente de verificación. Completa el proceso para recibir pagos."
                    : "Your account is pending verification. Complete the process to receive payments."}
                </p>
                <Button onClick={handleConnectStripe} disabled={connectLoading} className="gap-2">
                  {connectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {language === "es" ? "Completar verificación" : "Complete verification"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {language === "es" ? "✅ Cuenta conectada · Pagos cada miércoles" : "✅ Account connected · Paid every Wednesday"}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === "es" ? "Mínimo para retiro" : "Minimum for payout"}
                    </p>
                    <p className="text-lg font-bold">${MINIMUM_PAYOUT} USD</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === "es" ? "Próximo pago" : "Next payout"}
                    </p>
                    <p className="text-lg font-bold">{getNextWednesday()}</p>
                  </div>
                </div>

                {usdAvailable >= MINIMUM_PAYOUT ? (
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      ✨ {language === "es"
                        ? `¡Tienes ${formatCurrency(usdAvailable)} listos para el próximo pago!`
                        : `You have ${formatCurrency(usdAvailable)} ready for the next payout!`}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {language === "es"
                        ? `Te faltan ${formatCurrency(MINIMUM_PAYOUT - usdAvailable)} para el mínimo de retiro.`
                        : `You need ${formatCurrency(MINIMUM_PAYOUT - usdAvailable)} more to reach the minimum payout.`}
                    </p>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  onClick={handleOpenDashboard} 
                  disabled={dashboardLoading}
                  className="w-full gap-2"
                >
                  {dashboardLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {language === "es" ? "Ver panel de pagos en Stripe" : "View payment dashboard in Stripe"}
                </Button>
              </div>
            )}
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
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
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
              {language === "es" ? "Tus referidos" : "Your referrals"}
            </h3>
            {dashReferrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {language === "es"
                    ? "Aún no tienes referidos. ¡Comparte tu link y empieza a ganar!"
                    : "No referrals yet. Share your link and start earning!"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashReferrals.map((referral, i) => (
                  <div
                    key={`${referral.email_masked}-${i}`}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
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
                {language === "es" ? "Historial de comisiones" : "Commission history"}
              </h3>
              <div className="space-y-2">
                {commissionsHistory.map((commission, i) => (
                  <div
                    key={`${commission.month}-${i}`}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
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
            {language === "es" ? "¡Empieza a ganar dinero hoy!" : "Start earning money today!"}
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
