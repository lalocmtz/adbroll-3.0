import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, User, Globe, DollarSign, LogOut } from "lucide-react";

const Settings = () => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
