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
import { Settings as SettingsIcon, User, Globe, LogOut, CreditCard, Loader2, ExternalLink, Calendar } from "lucide-react";

interface SubscriptionData {
  status: string;
  price_usd: number;
  renew_at: string | null;
  created_at: string | null;
}

const Settings = () => {
  const { language, setLanguage, currency, setCurrency } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);
        setMemberSince(user.created_at);

        // Fetch subscription data
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("status, price_usd, renew_at, created_at")
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(language === "es" ? "es-MX" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-2xl">
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

      <div className="space-y-5">
        {/* Profile Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {language === "es" ? "Mi Cuenta" : "My Account"}
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
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {language === "es" ? "Miembro desde:" : "Member since:"}{" "}
                <span className="font-medium text-foreground">{formatDate(memberSince)}</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Subscription Section */}
        <Card className={`p-5 ${subscription?.status === "active" ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" : ""}`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {language === "es" ? "Suscripción" : "Subscription"}
            </h2>
          </div>
          
          {subscription?.status === "active" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold">Adbroll Pro</span>
                    <Badge variant="default">
                      {language === "es" ? "Activo" : "Active"}
                    </Badge>
                  </div>
                  {subscription.renew_at && (
                    <p className="text-sm text-muted-foreground">
                      {language === "es" ? "Renueva el" : "Renews on"}{" "}
                      {formatDate(subscription.renew_at)}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="gap-2"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      {language === "es" ? "Abrir portal de Stripe" : "Open Stripe portal"}
                    </>
                  )}
                </Button>
              </div>
              
              {/* Subscription Info */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {language === "es" 
                    ? "• Tu suscripción es mensual y se renueva automáticamente"
                    : "• Your subscription is monthly and renews automatically"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "es"
                    ? "• Puedes cancelarla en cualquier momento desde el portal"
                    : "• You can cancel anytime from the portal"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "es"
                    ? "• Al cancelar, mantienes acceso hasta el final del período pagado"
                    : "• When you cancel, you keep access until the end of the paid period"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                {language === "es" 
                  ? "No tienes suscripción activa"
                  : "You don't have an active subscription"}
              </p>
              <Button asChild>
                <a href="/pricing">
                  {language === "es" ? "Ver planes" : "View plans"}
                </a>
              </Button>
            </div>
          )}
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

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {language === "es" ? "Cerrar sesión" : "Sign out"}
        </Button>
      </div>
    </div>
  );
};

export default Settings;