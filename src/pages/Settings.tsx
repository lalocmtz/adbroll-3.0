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
import { Settings as SettingsIcon, User, Globe, LogOut, Users, Copy, Check, Crown, Wallet } from "lucide-react";

interface AffiliateData {
  ref_code: string;
  active_referrals_count: number;
  usd_earned: number;
  usd_available: number;
  usd_withdrawn: number;
}

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
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);
        
        // Fetch affiliate data
        const { data: affiliateData } = await supabase
          .from("affiliates")
          .select("ref_code, active_referrals_count, usd_earned, usd_available, usd_withdrawn")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (affiliateData) {
          setAffiliate(affiliateData);
        }

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

  const handleCopyLink = async () => {
    if (affiliate?.ref_code) {
      const link = `${window.location.origin}?ref=${affiliate.ref_code}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: language === "es" ? "✓ Enlace copiado" : "✓ Link copied" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {language === "es" ? "Configuración" : "Settings"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {language === "es"
            ? "Administra tu cuenta y preferencias"
            : "Manage your account and preferences"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Plan Status */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {language === "es" ? "Tu Plan" : "Your Plan"}
            </h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold">
                  {subscription?.status === "active" ? "Adbroll Pro" : "Free"}
                </span>
                <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                  {subscription?.status === "active" 
                    ? (language === "es" ? "Activo" : "Active")
                    : (language === "es" ? "Inactivo" : "Inactive")}
                </Badge>
              </div>
              {subscription?.status === "active" && subscription.renew_at && (
                <p className="text-sm text-muted-foreground">
                  {language === "es" ? "Renueva el" : "Renews on"}{" "}
                  {new Date(subscription.renew_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription?.status !== "active" && (
              <Button className="gap-2">
                <Crown className="h-4 w-4" />
                {language === "es" ? "Actualizar a Pro - $49/mes" : "Upgrade to Pro - $49/mo"}
              </Button>
            )}
          </div>
        </Card>

        {/* Affiliate Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {language === "es" ? "Programa de Afiliados" : "Affiliate Program"}
            </h2>
          </div>
          
          {affiliate ? (
            <div className="space-y-4">
              {/* Affiliate Code */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  {language === "es" ? "Tu código de afiliado" : "Your affiliate code"}
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Input 
                    value={affiliate.ref_code} 
                    readOnly 
                    className="font-mono font-bold tracking-wider"
                  />
                  <Button variant="outline" onClick={handleCopyLink} className="shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Affiliate Link */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  {language === "es" ? "Tu enlace de referido" : "Your referral link"}
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Input 
                    value={`${window.location.origin}?ref=${affiliate.ref_code}`} 
                    readOnly 
                    className="text-sm"
                  />
                  <Button variant="outline" onClick={handleCopyLink} className="shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {affiliate.active_referrals_count}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" ? "Referidos" : "Referrals"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(affiliate.usd_earned)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" ? "Ganado" : "Earned"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(affiliate.usd_available)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === "es" ? "Disponible" : "Available"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                {language === "es" 
                  ? "Gana $5 USD por cada referido que se suscriba a Pro"
                  : "Earn $5 USD for each referral that subscribes to Pro"}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <Wallet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {language === "es" 
                  ? "Cargando datos de afiliado..."
                  : "Loading affiliate data..."}
              </p>
            </div>
          )}
        </Card>

        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {language === "es" ? "Perfil" : "Profile"}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>{language === "es" ? "Nombre" : "Name"}</Label>
              <Input value={userName} readOnly className="mt-1.5 bg-muted" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={userEmail} readOnly className="mt-1.5 bg-muted" />
            </div>
          </div>
        </Card>

        {/* Preferences Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {language === "es" ? "Preferencias" : "Preferences"}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>{language === "es" ? "Idioma" : "Language"}</Label>
              <Select value={language} onValueChange={(v: "es" | "en") => setLanguage(v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇲🇽 Español</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === "es" ? "Moneda" : "Currency"}</Label>
              <Select value={currency} onValueChange={(v: "MXN" | "USD") => setCurrency(v)}>
                <SelectTrigger className="mt-1.5">
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
        <Card className="p-6 border-destructive/50">
          <h2 className="text-lg font-semibold text-destructive mb-4">
            {language === "es" ? "Zona de peligro" : "Danger Zone"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {language === "es"
              ? "Cerrar sesión de tu cuenta"
              : "Sign out of your account"}
          </p>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {language === "es" ? "Cerrar sesión" : "Sign out"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
