import { NavLink } from "./NavLink";
import { Video, Package, TrendingUp, UserPlus, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const DashboardNav = () => {
  const { t, language } = useLanguage();

  const navItems = [
    { to: "/app", label: t("videos"), icon: Video },
    { to: "/products", label: t("products"), icon: Package },
    { to: "/ranking-creadores", label: language === "es" ? "Ranking Creadores" : "Creator Rankings", icon: TrendingUp },
    { to: "/contrata-creadores", label: language === "es" ? "Contrata Creadores" : "Hire Creators", icon: UserPlus },
    { to: "/favorites", label: t("favorites"), icon: Heart },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-6 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              activeClassName="text-primary border-b-2 border-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
