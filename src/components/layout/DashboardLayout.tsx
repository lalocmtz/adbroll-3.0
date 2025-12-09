import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import DashboardFooter from "@/components/DashboardFooter";
import PreviewBanner from "@/components/PreviewBanner";
import { Menu, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useLanguage } from "@/contexts/LanguageContext";
import logoDark from "@/assets/logo-dark.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoggedIn } = useBlurGateContext();
  const { language } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Preview Banner removed */}
      
      <div className="flex flex-1">
        {/* Sidebar */}
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content area */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Mobile header with centered logo */}
          <div className="lg:hidden sticky top-0 z-30 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between px-4">
            {/* Menu button - left */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo - centered */}
            <button
              onClick={() => navigate("/app")}
              className="absolute left-1/2 -translate-x-1/2"
            >
              <img src={logoDark} alt="adbroll" className="h-7" />
            </button>

            {/* Login button - right (only for visitors) */}
            {!isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-xs font-medium text-muted-foreground hover:text-primary shrink-0"
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                {language === "es" ? "Entrar" : "Sign in"}
              </Button>
            ) : (
              <div className="w-[72px]" /> // Spacer to keep logo centered
            )}
          </div>

          {/* Page content */}
          <main className="flex-1">
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