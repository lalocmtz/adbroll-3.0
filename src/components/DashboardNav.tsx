import { NavLink } from "./NavLink";
import { Video, Package, TrendingUp, Star, Users } from "lucide-react";

const DashboardNav = () => {
  const navItems = [
    { to: "/app", label: "Videos", icon: Video },
    { to: "/products", label: "Productos", icon: Package },
    { to: "/opportunities", label: "Oportunidades", icon: TrendingUp },
    { to: "/favorites", label: "Favoritos", icon: Star },
    { to: "/affiliates", label: "Afiliados", icon: Users },
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
