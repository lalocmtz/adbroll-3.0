import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardFooter from "@/components/DashboardFooter";
import { Menu, UserRound } from "lucide-react";
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
          <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-3">
            <div className="flex min-w-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú" aria-expanded={sidebarOpen} className="h-11 w-11 shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
              <button type="button" className="flex h-11 items-center" aria-label="Ir a Videos" onClick={() => navigate('/app')}>
                <BrandLogo size="sm" tone="dark" />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(isLoggedIn ? "/settings" : "/login")} className="h-11 shrink-0 gap-1.5 px-2 text-sm">
              {isLoggedIn && <UserRound className="h-4 w-4" />}
              {isLoggedIn ? "Mi cuenta" : "Entrar"}
            </Button>
          </header>

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
