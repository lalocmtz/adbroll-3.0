import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useAccountType } from "@/hooks/useAccountType";
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
  FolderOpen,
  Megaphone,
  Send,
  Building2,
  LayoutDashboard,
  FolderKanban,
  ArrowUpCircle,
  Video,
} from "lucide-react";
import PricingModal from "@/components/PricingModal";
import MarketSwitcher from "@/components/MarketSwitcher";
import logoDark from "@/assets/logo-dark.png";

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  labelEs: string;
  labelEn: string;
  icon: any;
  lockedForVisitor: boolean;
}

// Section labels
const sectionLabels = {
  explore: { es: "EXPLORA TIKTOKSHOP", en: "EXPLORE TIKTOKSHOP" },
  earn: { es: "GANA DINERO", en: "EARN MONEY" },
  workspace: { es: "TU CENTRO", en: "YOUR HUB" },
  account: { es: "CUENTA", en: "ACCOUNT" },
  brand: { es: "PANEL MARCA", en: "BRAND PANEL" },
};

// EXPLORA - TikTok Shop content
const exploreItems: NavItem[] = [
  { to: "/app", labelEs: "Videos", labelEn: "Videos", icon: PlayCircle, lockedForVisitor: false },
  { to: "/products", labelEs: "Productos", labelEn: "Products", icon: Package, lockedForVisitor: false },
  { to: "/creadores", labelEs: "Creadores", labelEn: "Creators", icon: Users, lockedForVisitor: false },
  { to: "/opportunities", labelEs: "Oportunidades", labelEn: "Opportunities", icon: TrendingUp, lockedForVisitor: false },
];

// GANA DINERO - Monetization
const earnItems: NavItem[] = [
  { to: "/campaigns", labelEs: "Campañas", labelEn: "Campaigns", icon: Megaphone, lockedForVisitor: false },
  { to: "/my-submissions", labelEs: "Colaboraciones", labelEn: "Collaborations", icon: Send, lockedForVisitor: true },
  { to: "/affiliates", labelEs: "Afiliados", labelEn: "Affiliates", icon: Coins, lockedForVisitor: true },
];

// TU CENTRO - Work tools
const workspaceItems: NavItem[] = [
  { to: "/tools", labelEs: "Herramientas", labelEn: "Tools", icon: Wrench, lockedForVisitor: true },
  { to: "/my-generated-videos", labelEs: "Mis Videos IA", labelEn: "My AI Videos", icon: Video, lockedForVisitor: true },
  { to: "/library", labelEs: "Mi Biblioteca", labelEn: "My Library", icon: FolderOpen, lockedForVisitor: true },
  { to: "/favorites", labelEs: "Favoritos", labelEn: "Favorites", icon: Heart, lockedForVisitor: true },
  { to: "/affiliates", labelEs: "Afiliados", labelEn: "Affiliates", icon: Coins, lockedForVisitor: true },
];

// PANEL MARCA - Brand specific
const brandItems: NavItem[] = [
  { to: "/brand/dashboard", labelEs: "Dashboard", labelEn: "Dashboard", icon: LayoutDashboard, lockedForVisitor: true },
  { to: "/brand/campaigns", labelEs: "Mis Campañas", labelEn: "My Campaigns", icon: FolderKanban, lockedForVisitor: true },
  { to: "/brand/upgrade", labelEs: "Mejorar Plan", labelEn: "Upgrade Plan", icon: ArrowUpCircle, lockedForVisitor: true },
];

const DashboardSidebar = ({ open, onClose }: DashboardSidebarProps) => {
  const { language } = useLanguage();
  const { isLoggedIn } = useBlurGateContext();
  const { isBrand } = useAccountType();
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

  const renderSectionLabel = (labelKey: keyof typeof sectionLabels) => (
    <div className="px-3 pt-4 pb-2">
      <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
        {language === "es" ? sectionLabels[labelKey].es : sectionLabels[labelKey].en}
      </span>
    </div>
  );

  const renderNavItem = (item: NavItem) => {
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
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative w-full",
            "text-muted-foreground/60 hover:text-muted-foreground"
          )}
        >
          <item.icon className="h-4 w-4 text-muted-foreground/40" />
          <span className="flex-1 text-left">{language === "es" ? item.labelEs : item.labelEn}</span>
          <Lock className="h-3 w-3 text-muted-foreground/40" />
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={handleNavClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
          isActive(item.to)
            ? "text-primary bg-primary/10"
            : "text-foreground/80 hover:text-primary hover:bg-muted/50"
        )}
      >
        {isActive(item.to) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
        )}
        <item.icon 
          className={cn(
            "h-4 w-4 transition-colors",
            isActive(item.to) ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span>{language === "es" ? item.labelEs : item.labelEn}</span>
      </NavLink>
    );
  };

  const renderAffiliateItem = () => {
    if (!isLoggedIn) return null;
    
    const item = earnItems.find(i => i.to === "/affiliates")!;
    
    return (
      <NavLink
        to={item.to}
        onClick={handleNavClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
          isActive(item.to)
            ? "text-primary bg-primary/10"
            : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20"
        )}
      >
        <Coins className="h-4 w-4" />
        <div className="flex flex-col">
          <span>{language === "es" ? item.labelEs : item.labelEn}</span>
          <span className="text-[10px] font-normal opacity-80">
            {language === "es" ? "💰 gana dinero hoy" : "💰 earn money today"}
          </span>
        </div>
      </NavLink>
    );
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
          "fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 lg:translate-x-0",
          "w-[240px] bg-background border-r border-border",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-5 right-4 lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Logo */}
        <div className="px-5 pt-6 pb-2">
          <button
            onClick={() => {
              navigate("/app");
              handleNavClick();
            }}
            className="flex items-center"
          >
            <img src={logoDark} alt="adbroll" className="h-9" />
          </button>
        </div>

        {/* Market Switcher */}
        <div className="px-3 py-3">
          <MarketSwitcher variant="tabs" className="w-full" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {/* EXPLORA Section */}
          {renderSectionLabel("explore")}
          <div className="space-y-0.5">
            {exploreItems.map(renderNavItem)}
          </div>

          {/* GANA DINERO Section - Hidden temporarily, code preserved for future use */}
          {/* {renderSectionLabel("earn")}
          <div className="space-y-0.5">
            {earnItems.filter(i => i.to !== "/affiliates").map(renderNavItem)}
            {renderAffiliateItem()}
          </div> */}

          {/* TU CENTRO Section */}
          {renderSectionLabel("workspace")}
          <div className="space-y-0.5">
            {workspaceItems.map(renderNavItem)}
          </div>

          {/* PANEL MARCA Section - Hidden temporarily, code preserved for future use */}
          {/* {isLoggedIn && isBrand && (
            <>
              <div className="py-3 px-3">
                <Separator className="bg-border" />
              </div>
              {renderSectionLabel("brand")}
              <div className="space-y-0.5">
                {brandItems.map(renderNavItem)}
              </div>
            </>
          )} */}

          {/* Become a Brand CTA - Hidden temporarily, code preserved for future use */}
          {/* {isLoggedIn && !isBrand && (
            <div className="mt-4 mx-0">
              <button
                onClick={() => {
                  navigate("/brand/register");
                  handleNavClick();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full transition-all duration-200 bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 hover:from-violet-500/20 hover:to-purple-500/20"
              >
                <Building2 className="h-4 w-4" />
                <div className="flex flex-col text-left">
                  <span className="font-medium">{language === "es" ? "¿Eres una marca?" : "Are you a brand?"}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {language === "es" ? "Lanza campañas aquí" : "Launch campaigns here"}
                  </span>
                </div>
              </button>
            </div>
          )} */}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-5 pt-2 space-y-1">
          <Separator className="bg-border mb-3" />

          {/* Settings - only for logged in */}
          {isLoggedIn && (
            <NavLink
              to="/settings"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                isActive("/settings")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/80 hover:text-primary hover:bg-muted/50"
              )}
            >
              <Settings className={cn("h-4 w-4", isActive("/settings") ? "text-primary" : "text-muted-foreground")} />
              <span>{language === "es" ? "Configuración" : "Settings"}</span>
            </NavLink>
          )}

          {/* Support - only for logged in */}
          {isLoggedIn && (
            <button
              onClick={() => {
                navigate("/support");
                handleNavClick();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-primary hover:bg-muted/50 w-full transition-all duration-200"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>{language === "es" ? "Soporte" : "Support"}</span>
            </button>
          )}

          {/* Logout button - only for logged in users */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>{language === "es" ? "Cerrar sesión" : "Sign out"}</span>
            </button>
          )}

          {/* For visitors: Show unlock + login buttons */}
          {!isLoggedIn && (
            <div className="flex flex-col space-y-2 pt-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90"
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

          {/* User card - only for logged in users */}
          {isLoggedIn && (
            <button
              onClick={() => {
                navigate("/settings");
                handleNavClick();
              }}
              className="flex items-center gap-3 p-2.5 rounded-xl w-full transition-all duration-200 hover:bg-muted mt-2 bg-muted/30"
            >
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate text-foreground">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
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