import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle,
  Package,
  Users,
  Heart,
  Settings,
  HelpCircle,
  X,
  TrendingUp,
  Coins,
  Wrench,
  LogIn,
  Lock,
  Unlock,
  LogOut,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    handleNavClick();
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
        <div className="px-5 pb-6 pt-3 space-y-2">
          <Separator className="bg-separator mb-3" />

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

          {/* Logout button - only for logged in users */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>{language === "es" ? "Cerrar sesión" : "Sign out"}</span>
            </button>
          )}

          {/* For visitors: Show only login button */}
          {!isLoggedIn && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {language === "es" ? "Iniciar sesión" : "Sign in"}
            </Button>
          )}

          {/* User card - only for logged in users, navigates to settings */}
          {isLoggedIn && (
            <button
              onClick={() => {
                navigate("/settings");
                handleNavClick();
              }}
              className="flex items-center gap-3 p-3 rounded-xl w-full transition-all duration-200 hover:bg-muted mt-2"
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
            </button>
          )}
        </div>
      </aside>

      {/* Pricing Modal */}
      <PricingModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </>
  );
};

export default DashboardSidebar;