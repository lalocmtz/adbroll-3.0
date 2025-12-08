import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
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
  X,
  TrendingUp,
  Coins,
  Wrench,
  LogIn,
  Lock,
  Unlock,
} from "lucide-react";
import PricingModal from "@/components/PricingModal";
import logoDark from "@/assets/logo-dark.png";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

// Nav items - Products, Creators, Opportunities are accessible for visitors (first 3 items visible)
const navItems = [
  { to: "/app", label: "videos", labelEs: "Videos", labelEn: "Videos", icon: PlayCircle, lockedForVisitor: false },
  { to: "/products", label: "products", labelEs: "Productos", labelEn: "Products", icon: Package, lockedForVisitor: false },
  { to: "/creadores", label: "creators", labelEs: "Creadores", labelEn: "Creators", icon: Users, lockedForVisitor: false },
  { to: "/opportunities", label: "opportunities", labelEs: "Oportunidades", labelEn: "Opportunities", icon: TrendingUp, lockedForVisitor: false },
  { to: "/favorites", label: "favorites", labelEs: "Favoritos", labelEn: "Favorites", icon: Heart, lockedForVisitor: true },
  { to: "/tools", label: "tools", labelEs: "Herramientas", labelEn: "Tools", icon: Wrench, lockedForVisitor: true },
];

const DashboardSidebar = ({ open, onClose }: DashboardSidebarProps) => {
  const { language } = useLanguage();
  const { isLoggedIn, hasPaid } = useBlurGateContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserName(user.user_metadata?.full_name || user.email.split("@")[0]);
      }
    };
    if (isLoggedIn) {
      getUser();
    }
  }, [isLoggedIn]);

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
            className="flex items-center"
          >
            <img src={logoDark} alt="adbroll" className="h-10" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isLocked = !isLoggedIn && item.lockedForVisitor;
            
            if (isLocked) {
              return (
                <button
                  key={item.to}
                  onClick={() => {
                    navigate("/unlock");
                    handleNavClick();
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 relative w-full",
                    "text-muted-foreground/60 hover:text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground/40" />
                  <span className="flex-1 text-left">{language === "es" ? item.labelEs : item.labelEn}</span>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                </button>
              );
            }
            
            return (
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
                {isActive(item.to) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
                )}
                <item.icon 
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive(item.to) ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{language === "es" ? item.labelEs : item.labelEn}</span>
              </NavLink>
            );
          })}

          {/* Separator */}
          <div className="py-4">
            <Separator className="bg-separator" />
          </div>

          {/* Affiliates - HIDE for visitors */}
          {isLoggedIn && (
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
          )}

          {/* Settings - HIDE for visitors */}
          {isLoggedIn && (
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
          )}
        </nav>

        {/* Bottom section */}
        <div className="px-5 pb-6 pt-3 space-y-3">
          <Separator className="bg-separator" />

          {/* Support link - HIDE for visitors */}
          {isLoggedIn && (
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
          )}

          {/* For visitors: Show unlock + login buttons */}
          {!isLoggedIn && (
            <div className="space-y-2">
              <Button
                className="w-full bg-primary hover:bg-primary-hover"
                onClick={() => navigate("/unlock")}
              >
                <Unlock className="h-4 w-4 mr-2" />
                {language === "es" ? "Desbloquear todo" : "Unlock everything"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {language === "es" ? "Iniciar sesión" : "Sign in"}
              </Button>
            </div>
          )}

          {/* Plan Card - Only for logged in users */}
          {isLoggedIn && (
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-muted/50 border border-[#E2E8F0] dark:border-border">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-base">💼</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-[#0F172A] dark:text-foreground">
                    {language === "es" ? "Plan actual:" : "Current plan:"} <span className="text-primary">{hasPaid ? "Pro" : "Free"}</span>
                  </p>
                  {!hasPaid && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {language === "es" ? "🚀 Mejora para desbloquear todo" : "🚀 Upgrade to unlock everything"}
                    </p>
                  )}
                </div>
              </div>
              {!hasPaid && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-8 text-xs rounded-lg"
                  onClick={() => setPricingModalOpen(true)}
                >
                  {language === "es" ? "Activar Pro — $29/mes" : "Activate Pro — $29/mo"}
                </Button>
              )}
            </div>
          )}

          {/* User card - only for logged in users */}
          {isLoggedIn && (
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
          )}
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
                  <p className="font-semibold">{hasPaid ? "Pro" : "Free"}</p>
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

      {/* Pricing Modal */}
      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </>
  );
};

export default DashboardSidebar;
