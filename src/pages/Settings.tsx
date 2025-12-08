import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, User, Globe, LogOut, Crown, Gift, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";
import { useReferralCode, PLANS } from "@/hooks/useReferralCode";
import { ReferralDiscountBanner } from "@/components/PricingCard";

// Plan Status Card with Stripe Portal integration
const PlanStatusCard = ({ 
  subscription, 
  language 
}: { 
  subscription: SubscriptionData | null; 
  language: string;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code_used, id")
        .single();

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { referral_code: profile?.referral_code_used },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo iniciar el pago" 
          : "Could not start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo abrir el portal" 
          : "Could not open portal",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <Crown className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">
          {language === "es" ? "Tu Plan" : "Your Plan"}
        </h2>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">
              {subscription?.status === "active" ? "Adbroll Pro" : "Free"}
            </span>
            <Badge
              variant={subscription?.status === "active" ? "default" : "secondary"}
            >
              {subscription?.status === "active"
                ? language === "es" ? "Activo" : "Active"
                : language === "es" ? "Inactivo" : "Inactive"}
            </Badge>
          </div>
          {subscription?.status === "active" && subscription.renew_at && (
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Renueva el" : "Renews on"}{" "}
              {new Date(subscription.renew_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {subscription?.status === "active" ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                {language === "es" ? "Gestionar" : "Manage"}
              </>
            )}
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="gap-2"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Crown className="h-4 w-4" />
                {language === "es" ? "Upgrade - $29/mes" : "Upgrade - $29/mo"}
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

interface SubscriptionData {
  status: string;
  price_usd: number;
  renew_at: string | null;
}

const Settings = () => {
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [copied, setCopied] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState("");

  const {
    affiliateCode,
    referralCodeUsed,
    loading: referralLoading,
    createAffiliateCode,
    applyReferralCode,
    refetch,
  } = useReferralCode();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);

        // Fetch subscription data
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, price_usd, renew_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (subData) {
          setSubscription(subData);
        }
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCreateAffiliateCode = async () => {
    const { code, error } = await createAffiliateCode();
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "es" ? "¡Código creado!" : "Code created!",
        description: `${language === "es" ? "Tu código:" : "Your code:"} ${code}`,
      });
      refetch();
    }
  };

  const handleApplyReferralCode = async () => {
    if (!newReferralCode) return;

    const { success, error } = await applyReferralCode(newReferralCode);
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: language === "es" ? "¡Código aplicado!" : "Code applied!",
        description:
          language === "es"
            ? "50% de descuento en tu primer mes"
            : "50% off your first month",
      });
      setNewReferralCode("");
      refetch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: language === "es" ? "Copiado" : "Copied",
      description:
        language === "es" ? "Código copiado al portapapeles" : "Code copied to clipboard",
    });
  };

  return (
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-2xl">
      <DataSubtitle />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold">
            {language === "es" ? "Configuración" : "Settings"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {language === "es"
            ? "Administra tu cuenta y preferencias"
            : "Manage your account and preferences"}
        </p>
      </div>

      <ReferralDiscountBanner />

      <div className="space-y-5">
        {/* Plan Status */}
        <PlanStatusCard 
          subscription={subscription} 
          language={language} 
        />

        {/* Affiliate Code Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {language === "es" ? "Tu Código de Afiliado" : "Your Affiliate Code"}
            </h2>
          </div>

          {affiliateCode ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === "es"
                  ? "Comparte tu código y gana comisiones cuando otros se suscriban."
                  : "Share your code and earn commissions when others subscribe."}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={affiliateCode.code}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(affiliateCode.code)}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/register?ref=${affiliateCode.code}`}
                  readOnly
                  className="text-sm text-muted-foreground"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/register?ref=${affiliateCode.code}`
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === "es"
                  ? "Crea tu código único para compartir y ganar comisiones."
                  : "Create your unique code to share and earn commissions."}
              </p>
              <Button onClick={handleCreateAffiliateCode} disabled={referralLoading}>
                <Gift className="h-4 w-4 mr-2" />
                {language === "es" ? "Crear código" : "Create code"}
              </Button>
            </div>
          )}
        </Card>

        {/* Apply Referral Code Section (only if user doesn't have one) */}
        {!referralCodeUsed && (
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">
                {language === "es" ? "Aplicar Código de Referido" : "Apply Referral Code"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {language === "es"
                ? "¿Tienes un código de un amigo? Aplícalo para obtener 50% de descuento en tu primer mes."
                : "Have a friend's code? Apply it to get 50% off your first month."}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={newReferralCode}
                onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="font-mono"
              />
              <Button onClick={handleApplyReferralCode} disabled={!newReferralCode}>
                {language === "es" ? "Aplicar" : "Apply"}
              </Button>
            </div>
          </Card>
        )}

        {/* Show applied referral code */}
        {referralCodeUsed && (
          <Card className="p-5 bg-green-50 border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <Check className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-green-800">
                {language === "es" ? "Código de Referido Aplicado" : "Referral Code Applied"}
              </h2>
            </div>
            <p className="text-sm text-green-700">
              {language === "es" ? "Código:" : "Code:"} <strong>{referralCodeUsed}</strong>
            </p>
          </Card>
        )}

        {/* Profile Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">
              {language === "es" ? "Perfil" : "Profile"}
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{language === "es" ? "Nombre" : "Name"}</Label>
              <Input value={userName} readOnly className="mt-1 bg-muted h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={userEmail} readOnly className="mt-1 bg-muted h-9" />
            </div>
          </div>
        </Card>

        {/* Preferences Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">
              {language === "es" ? "Preferencias" : "Preferences"}
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{language === "es" ? "Idioma" : "Language"}</Label>
              <Select value={language} onValueChange={(v: "es" | "en") => setLanguage(v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇲🇽 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{language === "es" ? "Moneda" : "Currency"}</Label>
              <Select value={currency} onValueChange={(v: "MXN" | "USD") => setCurrency(v)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">$ MXN (Peso mexicano)</SelectItem>
                  <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-5 border-destructive/50">
          <h2 className="font-semibold text-destructive mb-3">
            {language === "es" ? "Zona de peligro" : "Danger Zone"}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            {language === "es" ? "Cerrar sesión de tu cuenta" : "Sign out of your account"}
          </p>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {language === "es" ? "Cerrar sesión" : "Sign out"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
