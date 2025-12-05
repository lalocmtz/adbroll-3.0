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
import { Settings as SettingsIcon, User, Globe, LogOut, Crown } from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";

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

      <div className="space-y-5">
        {/* Plan Status */}
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
                <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                  {subscription?.status === "active" 
                    ? (language === "es" ? "Activo" : "Active")
                    : (language === "es" ? "Inactivo" : "Inactive")}
                </Badge>
              </div>
              {subscription?.status === "active" && subscription.renew_at && (
                <p className="text-xs text-muted-foreground">
                  {language === "es" ? "Renueva el" : "Renews on"}{" "}
                  {new Date(subscription.renew_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {subscription?.status !== "active" && (
              <Button size="sm" className="gap-2">
                <Crown className="h-4 w-4" />
                {language === "es" ? "Upgrade - $49/mes" : "Upgrade - $49/mo"}
              </Button>
            )}
          </div>
        </Card>

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
            {language === "es"
              ? "Cerrar sesión de tu cuenta"
              : "Sign out of your account"}
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
