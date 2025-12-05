import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Package,
  Users,
  Heart,
  Wrench,
  Settings,
  HelpCircle,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect } from "react";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/app", label: "videos", icon: Video },
  { to: "/products", label: "products", icon: Package },
  { to: "/creadores", label: "creators", icon: Users },
  { to: "/favorites", label: "favorites", icon: Heart },
  { to: "/tools", label: "tools", icon: Wrench },
  { to: "/settings", label: "settings", icon: Settings },
];

const DashboardSidebar = ({ open, onClose }: DashboardSidebarProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);

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

  const getUserInitials = () => {
    if (!userName) return "U";
    return userName.substring(0, 2).toUpperCase();
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden p-1 rounded-md hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="p-6 pb-4">
          <button
            onClick={() => {
              navigate("/app");
              handleNavClick();
            }}
            className="flex items-center gap-2"
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              adbroll
            </h1>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 mt-auto space-y-3">
          <Separator />

          {/* Support link */}
          <button
            onClick={() => {
              navigate("/support");
              handleNavClick();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
            <span>{language === "es" ? "Soporte" : "Support"}</span>
          </button>

          {/* Subscription card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">AdBroll Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {language === "es"
                ? "Accede a todas las herramientas de análisis y guiones IA"
                : "Access all analytics tools and AI scripts"}
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                // Future: Open billing modal
                alert(language === "es" ? "Próximamente: Integración de pagos" : "Coming soon: Payment integration");
              }}
            >
              {language === "es" ? "Actualizar plan" : "Upgrade"} – $25/mes
            </Button>
          </div>

          {/* User card */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted w-full transition-colors"
          >
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      {/* Account Modal */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === "es" ? "Mi Cuenta" : "My Account"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{language === "es" ? "Plan actual" : "Current Plan"}</p>
                  <p className="font-semibold">Free</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">{language === "es" ? "Miembro desde" : "Member since"}</p>
                  <p className="font-semibold">2024</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="billing" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                {language === "es" ? "Próximamente: Gestión de facturación y pagos" : "Coming soon: Billing and payment management"}
              </div>
            </TabsContent>
            <TabsContent value="team" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                {language === "es" ? "Próximamente: Gestión de equipo" : "Coming soon: Team management"}
              </div>
            </TabsContent>
            <TabsContent value="api" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                {language === "es" ? "Próximamente: API e integraciones" : "Coming soon: API and integrations"}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardSidebar;
