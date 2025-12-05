import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle,
  Package,
  Users,
  Heart,
  Settings,
  HelpCircle,
  ChevronDown,
  Zap,
  X,
  TrendingUp,
  Coins,
  Wrench,
} from "lucide-react";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/app", label: "videos", labelEs: "Videos", labelEn: "Videos", icon: PlayCircle },
  { to: "/products", label: "products", labelEs: "Productos", labelEn: "Products", icon: Package },
  { to: "/creadores", label: "creators", labelEs: "Creadores", labelEn: "Creators", icon: Users },
  { to: "/opportunities", label: "opportunities", labelEs: "Oportunidades", labelEn: "Opportunities", icon: TrendingUp },
  { to: "/favorites", label: "favorites", labelEs: "Favoritos", labelEn: "Favorites", icon: Heart },
  { to: "/tools", label: "tools", labelEs: "Herramientas", labelEn: "Tools", icon: Wrench },
];

const DashboardSidebar = ({ open, onClose }: DashboardSidebarProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
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
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isActive = (path: string) => location.pathname === path;

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
          "fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 lg:translate-x-0",
          "w-[240px] bg-white dark:bg-card border-r",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ 
          borderColor: 'hsl(var(--sidebar-border))',
          backgroundColor: 'hsl(var(--sidebar-bg))'
        }}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-5 right-4 lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
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
        <nav className="flex-1 px-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative",
                isActive(item.to)
                  ? "text-primary"
                  : "text-foreground hover:text-primary"
              )}
              style={{
                backgroundColor: isActive(item.to) ? 'hsl(var(--sidebar-item-active-bg))' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.to)) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-item-hover-bg))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.to)) {
                  e.currentTarget.style.backgroundColor = '';
                }
              }}
            >
              {/* Active indicator */}
              {isActive(item.to) && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                />
              )}
              <item.icon 
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive(item.to) ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{language === "es" ? item.labelEs : item.labelEn}</span>
            </NavLink>
          ))}

          {/* Separator */}
          <div className="py-4">
            <Separator className="bg-separator" />
          </div>

          {/* Affiliates special button */}
          <NavLink
            to="/affiliates"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              isActive("/affiliates")
                ? "text-primary bg-[hsl(var(--sidebar-item-active-bg))]"
                : "hover:opacity-90"
            )}
            style={{
              backgroundColor: isActive("/affiliates") ? undefined : 'hsl(var(--sidebar-affiliate-bg))',
              color: isActive("/affiliates") ? undefined : 'hsl(var(--sidebar-affiliate-text))',
            }}
          >
            <Coins 
              className={cn(
                "h-5 w-5",
                isActive("/affiliates") ? "text-primary" : ""
              )}
              style={{ color: isActive("/affiliates") ? undefined : 'hsl(var(--sidebar-affiliate-text))' }}
            />
            <div className="flex flex-col">
              <span>{language === "es" ? "Afiliados" : "Affiliates"}</span>
              <span className="text-[10px] font-normal opacity-80">
                {language === "es" ? "💰 gana dinero hoy" : "💰 earn money today"}
              </span>
            </div>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative",
              isActive("/settings")
                ? "text-primary"
                : "text-foreground hover:text-primary"
            )}
            style={{
              backgroundColor: isActive("/settings") ? 'hsl(var(--sidebar-item-active-bg))' : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isActive("/settings")) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-item-hover-bg))';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/settings")) {
                e.currentTarget.style.backgroundColor = '';
              }
            }}
          >
            {isActive("/settings") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
            )}
            <Settings 
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/settings") ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span>{language === "es" ? "Configuración" : "Settings"}</span>
          </NavLink>
        </nav>

        {/* Bottom section */}
        <div className="px-5 pb-6 pt-3 space-y-3">
          {/* Separator */}
          <Separator className="bg-separator" />

          {/* Support link */}
          <button
            onClick={() => {
              navigate("/support");
              handleNavClick();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-[hsl(var(--sidebar-item-hover-bg))] w-full transition-all duration-200"
          >
            <HelpCircle className="h-5 w-5" />
            <span>{language === "es" ? "Soporte" : "Support"}</span>
          </button>

          {/* Upgrade Plan CTA */}
          <Button
            className="w-full h-11 rounded-xl font-semibold text-sm gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={() => {
              alert(language === "es" ? "Próximamente: Integración de pagos" : "Coming soon: Payment integration");
            }}
          >
            <Zap className="h-4 w-4" />
            {language === "es" ? "Actualizar plan" : "Upgrade"} – $25/mes
          </Button>

          {/* User card */}
          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex items-center gap-3 p-3 rounded-xl w-full transition-all duration-200 hover:bg-muted"
            style={{ backgroundColor: 'hsl(var(--sidebar-user-bg))' }}
          >
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
