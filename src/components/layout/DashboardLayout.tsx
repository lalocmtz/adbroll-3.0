import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardFooter from "@/components/DashboardFooter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoggedIn } = useBlurGateContext();
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] w-full min-w-0 bg-background flex flex-col">
      {/* Preview Banner removed */}
      
      <div className="flex min-w-0 flex-1">
        {/* Sidebar */}
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <div className="lg:pl-64 flex min-w-0 w-full flex-col flex-1">
          {/* Mobile menu button only */}
          <div className="lg:hidden sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="h-11 w-11 shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Ir a Videos" onClick={() => navigate('/app')}><BrandLogo iconOnly size="sm" tone="dark" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(isLoggedIn ? "/affiliates" : "/programa-creadores")} className="h-11 px-2 text-xs font-semibold text-primary">Gana recomendando</Button>
            {/* Login button for visitors */}
            {!isLoggedIn && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/login")}
                className="h-11 px-2 text-xs sm:text-sm font-medium"
              >
                Entrar
              </Button>
            )}
          </div>

          {/* Page content */}
          <main className="min-w-0 w-full flex-1">
            {children}
          </main>

          {/* Footer */}
          <DashboardFooter />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
